import {
  defineComponent,
  inject,
  onUnmounted,
  provide,
  ref,
  watchEffect,

  // Types
  InjectionKey,
  Ref,
  computed,
} from 'vue'

import { match } from '../../utils/match'
import { render, Features } from '../../utils/render'
import { useId } from '../../hooks/use-id'
import { Keys } from '../../keyboard'
import {
  getFocusableElements,
  Focus,
  focusIn,
  FocusResult,
  isFocusableElement,
  FocusableMode,
} from '../../utils/focus-management'
import { dom } from '../../utils/dom'
import { useWindowEvent } from '../../hooks/use-window-event'
import { useOpenClosedProvider, State, useOpenClosed } from '../../internal/open-closed'
import { useResolveButtonType } from '../../hooks/use-resolve-button-type'

enum PopoverStates {
  Open,
  Closed,
}

interface StateDefinition {
  // State
  popoverState: Ref<PopoverStates>
  button: Ref<HTMLElement | null>
  buttonId: string
  panel: Ref<HTMLElement | null>
  panelId: string

  // State mutators
  togglePopover(): void
  closePopover(): void

  // Exposed functions
  close(focusableElement: HTMLElement | Ref<HTMLElement | null>): void
}

let PopoverContext = Symbol('PopoverContext') as InjectionKey<StateDefinition>
function usePopoverContext(component: string) {
  let context = inject(PopoverContext, null)
  if (context === null) {
    let err = new Error(`<${component} /> is missing a parent <${Popover.name} /> component.`)
    if (Error.captureStackTrace) Error.captureStackTrace(err, usePopoverContext)
    throw err
  }
  return context
}

let PopoverGroupContext = Symbol('PopoverGroupContext') as InjectionKey<{
  registerPopover(registerbag: PopoverRegisterBag): void
  unregisterPopover(registerbag: PopoverRegisterBag): void
  isFocusWithinPopoverGroup(): boolean
  closeOthers(buttonId: string): void
} | null>

function usePopoverGroupContext() {
  return inject(PopoverGroupContext, null)
}

let PopoverPanelContext = Symbol('PopoverPanelContext') as InjectionKey<string | null>
function usePopoverPanelContext() {
  return inject(PopoverPanelContext, null)
}

interface PopoverRegisterBag {
  buttonId: string
  panelId: string
  close(): void
}

// ---

export let Popover = defineComponent({
  name: 'Popover',
  props: {
    as: { type: [Object, String], default: 'div' },
  },
  setup(props, { slots, attrs }) {
    let buttonId = `headlessui-popover-button-${useId()}`
    let panelId = `headlessui-popover-panel-${useId()}`

    let popoverState = ref<StateDefinition['popoverState']['value']>(PopoverStates.Closed)
    let button = ref<StateDefinition['button']['value']>(null)
    let panel = ref<StateDefinition['panel']['value']>(null)

    let api = {
      popoverState,
      buttonId,
      panelId,
      panel,
      button,
      togglePopover() {
        popoverState.value = match(popoverState.value, {
          [PopoverStates.Open]: PopoverStates.Closed,
          [PopoverStates.Closed]: PopoverStates.Open,
        })
      },
      closePopover() {
        if (popoverState.value === PopoverStates.Closed) return
        popoverState.value = PopoverStates.Closed
      },
      close(focusableElement: HTMLElement | Ref<HTMLElement | null>) {
        api.closePopover()

        let restoreElement = (() => {
          if (!focusableElement) return dom(api.button)
          if (focusableElement instanceof HTMLElement) return focusableElement
          if (focusableElement.value instanceof HTMLElement) return dom(focusableElement)

          return dom(api.button)
        })()

        restoreElement?.focus()
      },
    } as StateDefinition

    provide(PopoverContext, api)
    useOpenClosedProvider(
      computed(() =>
        match(popoverState.value, {
          [PopoverStates.Open]: State.Open,
          [PopoverStates.Closed]: State.Closed,
        })
      )
    )

    let registerBag = {
      buttonId,
      panelId,
      close() {
        api.closePopover()
      },
    }

    let groupContext = usePopoverGroupContext()
    let registerPopover = groupContext?.registerPopover

    function isFocusWithinPopoverGroup() {
      return (
        groupContext?.isFocusWithinPopoverGroup() ??
        (dom(button)?.contains(document.activeElement) ||
          dom(panel)?.contains(document.activeElement))
      )
    }

    watchEffect(() => registerPopover?.(registerBag))

    // Handle focus out
    useWindowEvent(
      'focus',
      () => {
        if (popoverState.value !== PopoverStates.Open) return
        if (isFocusWithinPopoverGroup()) return
        if (!button) return
        if (!panel) return

        api.closePopover()
      },
      true
    )

    // Handle outside click
    useWindowEvent('mousedown', (event: MouseEvent) => {
      let target = event.target as HTMLElement

      if (popoverState.value !== PopoverStates.Open) return

      if (dom(button)?.contains(target)) return
      if (dom(panel)?.contains(target)) return

      api.closePopover()

      if (!isFocusableElement(target, FocusableMode.Loose)) {
        event.preventDefault()
        dom(button)?.focus()
      }
    })

    return () => {
      let slot = { open: popoverState.value === PopoverStates.Open, close: api.close }
      return render({ props, slot, slots, attrs, name: 'Popover' })
    }
  },
})

// ---

export let PopoverButton = defineComponent({
  name: 'PopoverButton',
  props: {
    as: { type: [Object, String], default: 'button' },
    disabled: { type: [Boolean], default: false },
  },
  setup(props, { attrs, slots }) {
    let api = usePopoverContext('PopoverButton')

    let groupContext = usePopoverGroupContext()
    let closeOthers = groupContext?.closeOthers

    let panelContext = usePopoverPanelContext()
    let isWithinPanel = panelContext === null ? false : panelContext === api.panelId

    // TODO: Revisit when handling Tab/Shift+Tab when using Portal's
    let activeElementRef = ref<Element | null>(null)
    let previousActiveElementRef = ref<Element | null>(
      typeof window === 'undefined' ? null : document.activeElement
    )

    useWindowEvent(
      'focus',
      () => {
        previousActiveElementRef.value = activeElementRef.value
        activeElementRef.value = document.activeElement
      },
      true
    )

    let elementRef = ref(null)

    if (!isWithinPanel) {
      watchEffect(() => {
        api.button.value = elementRef.value
      })
    }

    let type = useResolveButtonType(
      computed(() => ({ as: props.as, type: attrs.type })),
      elementRef
    )

    function handleKeyDown(event: KeyboardEvent) {
      if (isWithinPanel) {
        if (api.popoverState.value === PopoverStates.Closed) return
        switch (event.key) {
          case Keys.Space:
          case Keys.Enter:
            event.preventDefault() // Prevent triggering a *click* event
            event.stopPropagation()
            api.closePopover()
            dom(api.button)?.focus() // Re-focus the original opening Button
            break
        }
      } else {
        switch (event.key) {
          case Keys.Space:
          case Keys.Enter:
            event.preventDefault() // Prevent triggering a *click* event
            event.stopPropagation()
            if (api.popoverState.value === PopoverStates.Closed) closeOthers?.(api.buttonId)
            api.togglePopover()
            break

          case Keys.Escape:
            if (api.popoverState.value !== PopoverStates.Open) return closeOthers?.(api.buttonId)
            if (!dom(api.button)) return
            if (!dom(api.button)?.contains(document.activeElement)) return
            event.preventDefault()
            event.stopPropagation()
            api.closePopover()
            break

          case Keys.Tab:
            if (api.popoverState.value !== PopoverStates.Open) return
            if (!api.panel) return
            if (!api.button) return

            // TODO: Revisit when handling Tab/Shift+Tab when using Portal's
            if (event.shiftKey) {
              // Check if the last focused element exists, and check that it is not inside button or panel itself
              if (!previousActiveElementRef.value) return
              if (dom(api.button)?.contains(previousActiveElementRef.value)) return
              if (dom(api.panel)?.contains(previousActiveElementRef.value)) return

              // Check if the last focused element is *after* the button in the DOM
              let focusableElements = getFocusableElements()
              let previousIdx = focusableElements.indexOf(
                previousActiveElementRef.value as HTMLElement
              )
              let buttonIdx = focusableElements.indexOf(dom(api.button)!)
              if (buttonIdx > previousIdx) return

              event.preventDefault()
              event.stopPropagation()

              focusIn(dom(api.panel)!, Focus.Last)
            } else {
              event.preventDefault()
              event.stopPropagation()

              focusIn(dom(api.panel)!, Focus.First)
            }

            break
        }
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (isWithinPanel) return
      if (event.key === Keys.Space) {
        // Required for firefox, event.preventDefault() in handleKeyDown for
        // the Space key doesn't cancel the handleKeyUp, which in turn
        // triggers a *click*.
        event.preventDefault()
      }
      if (api.popoverState.value !== PopoverStates.Open) return
      if (!api.panel) return
      if (!api.button) return

      // TODO: Revisit when handling Tab/Shift+Tab when using Portal's
      switch (event.key) {
        case Keys.Tab:
          // Check if the last focused element exists, and check that it is not inside button or panel itself
          if (!previousActiveElementRef.value) return
          if (dom(api.button)?.contains(previousActiveElementRef.value)) return
          if (dom(api.panel)?.contains(previousActiveElementRef.value)) return

          // Check if the last focused element is *after* the button in the DOM
          let focusableElements = getFocusableElements()
          let previousIdx = focusableElements.indexOf(previousActiveElementRef.value as HTMLElement)
          let buttonIdx = focusableElements.indexOf(dom(api.button)!)
          if (buttonIdx > previousIdx) return

          event.preventDefault()
          event.stopPropagation()
          focusIn(dom(api.panel)!, Focus.Last)
          break
      }
    }

    function handleClick() {
      if (props.disabled) return
      if (isWithinPanel) {
        api.closePopover()
        dom(api.button)?.focus() // Re-focus the original opening Button
      } else {
        if (api.popoverState.value === PopoverStates.Closed) closeOthers?.(api.buttonId)
        dom(api.button)?.focus()
        api.togglePopover()
      }
    }

    return () => {
      let slot = { open: api.popoverState.value === PopoverStates.Open }
      let propsWeControl = isWithinPanel
        ? {
            ref: elementRef,
            type: type.value,
            onKeydown: handleKeyDown,
            onClick: handleClick,
          }
        : {
            ref: elementRef,
            id: api.buttonId,
            type: type.value,
            'aria-expanded': props.disabled
              ? undefined
              : api.popoverState.value === PopoverStates.Open,
            'aria-controls': dom(api.panel) ? api.panelId : undefined,
            disabled: props.disabled ? true : undefined,
            onKeydown: handleKeyDown,
            onKeyup: handleKeyUp,
            onClick: handleClick,
          }

      return render({
        props: { ...props, ...propsWeControl },
        slot,
        attrs: attrs,
        slots: slots,
        name: 'PopoverButton',
      })
    }
  },
})

// ---

export let PopoverOverlay = defineComponent({
  name: 'PopoverOverlay',
  props: {
    as: { type: [Object, String], default: 'div' },
    static: { type: Boolean, default: false },
    unmount: { type: Boolean, default: true },
  },
  setup(props, { attrs, slots }) {
    let api = usePopoverContext('PopoverOverlay')
    let id = `headlessui-popover-overlay-${useId()}`

    let usesOpenClosedState = useOpenClosed()
    let visible = computed(() => {
      if (usesOpenClosedState !== null) {
        return usesOpenClosedState.value === State.Open
      }

      return api.popoverState.value === PopoverStates.Open
    })

    function handleClick() {
      api.closePopover()
    }

    return () => {
      let slot = { open: api.popoverState.value === PopoverStates.Open }
      let propsWeControl = {
        id,
        'aria-hidden': true,
        onClick: handleClick,
      }

      return render({
        props: { ...props, ...propsWeControl },
        slot,
        attrs,
        slots,
        features: Features.RenderStrategy | Features.Static,
        visible: visible.value,
        name: 'PopoverOverlay',
      })
    }
  },
})

// ---

export let PopoverPanel = defineComponent({
  name: 'PopoverPanel',
  props: {
    as: { type: [Object, String], default: 'div' },
    static: { type: Boolean, default: false },
    unmount: { type: Boolean, default: true },
    focus: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots }) {
    let { focus } = props
    let api = usePopoverContext('PopoverPanel')

    provide(PopoverPanelContext, api.panelId)

    onUnmounted(() => {
      api.panel.value = null
    })

    // Move focus within panel
    watchEffect(() => {
      if (!focus) return
      if (api.popoverState.value !== PopoverStates.Open) return
      if (!api.panel) return

      let activeElement = document.activeElement as HTMLElement
      if (dom(api.panel)?.contains(activeElement)) return // Already focused within Dialog

      focusIn(dom(api.panel)!, Focus.First)
    })

    // Handle Tab / Shift+Tab focus positioning
    useWindowEvent('keydown', (event: KeyboardEvent) => {
      if (api.popoverState.value !== PopoverStates.Open) return
      if (!dom(api.panel)) return

      if (event.key !== Keys.Tab) return
      if (!document.activeElement) return
      if (!dom(api.panel)?.contains(document.activeElement)) return

      // We will take-over the default tab behaviour so that we have a bit
      // control over what is focused next. It will behave exactly the same,
      // but it will also "fix" some issues based on whether you are using a
      // Portal or not.
      event.preventDefault()

      let result = focusIn(dom(api.panel)!, event.shiftKey ? Focus.Previous : Focus.Next)

      if (result === FocusResult.Underflow) {
        return dom(api.button)?.focus()
      } else if (result === FocusResult.Overflow) {
        if (!dom(api.button)) return

        let elements = getFocusableElements()
        let buttonIdx = elements.indexOf(dom(api.button)!)

        let nextElements = elements
          .splice(buttonIdx + 1) // Elements after button
          .filter((element) => !dom(api.panel)?.contains(element)) // Ignore items in panel

        // Try to focus the next element, however it could fail if we are in a
        // Portal that happens to be the very last one in the DOM. In that
        // case we would Error (because nothing after the button is
        // focusable). Therefore we will try and focus the very first item in
        // the document.body.
        if (focusIn(nextElements, Focus.First) === FocusResult.Error) {
          focusIn(document.body, Focus.First)
        }
      }
    })

    // Handle focus out when we are in special "focus" mode
    useWindowEvent(
      'focus',
      () => {
        if (!focus) return
        if (api.popoverState.value !== PopoverStates.Open) return
        if (!dom(api.panel)) return
        if (dom(api.panel)?.contains(document.activeElement as HTMLElement)) return
        api.closePopover()
      },
      true
    )

    let usesOpenClosedState = useOpenClosed()
    let visible = computed(() => {
      if (usesOpenClosedState !== null) {
        return usesOpenClosedState.value === State.Open
      }

      return api.popoverState.value === PopoverStates.Open
    })

    function handleKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case Keys.Escape:
          if (api.popoverState.value !== PopoverStates.Open) return
          if (!dom(api.panel)) return
          if (!dom(api.panel)?.contains(document.activeElement)) return
          event.preventDefault()
          event.stopPropagation()
          api.closePopover()
          dom(api.button)?.focus()
          break
      }
    }

    return () => {
      let slot = {
        open: api.popoverState.value === PopoverStates.Open,
        close: api.close,
      }

      let propsWeControl = {
        ref: api.panel,
        id: api.panelId,
        onKeydown: handleKeyDown,
      }

      return render({
        props: { ...props, ...propsWeControl },
        slot,
        attrs,
        slots,
        features: Features.RenderStrategy | Features.Static,
        visible: visible.value,
        name: 'PopoverPanel',
      })
    }
  },
})

// ---

export let PopoverGroup = defineComponent({
  name: 'PopoverGroup',
  props: {
    as: { type: [Object, String], default: 'div' },
  },
  setup(props, { attrs, slots }) {
    let groupRef = ref<HTMLElement | null>(null)
    let popovers = ref<PopoverRegisterBag[]>([])

    function unregisterPopover(registerBag: PopoverRegisterBag) {
      let idx = popovers.value.indexOf(registerBag)
      if (idx !== -1) popovers.value.splice(idx, 1)
    }

    function registerPopover(registerBag: PopoverRegisterBag) {
      popovers.value.push(registerBag)
      return () => {
        unregisterPopover(registerBag)
      }
    }

    function isFocusWithinPopoverGroup() {
      let element = document.activeElement as HTMLElement

      if (dom(groupRef)?.contains(element)) return true

      // Check if the focus is in one of the button or panel elements. This is important in case you are rendering inside a Portal.
      return popovers.value.some((bag) => {
        return (
          document.getElementById(bag.buttonId)?.contains(element) ||
          document.getElementById(bag.panelId)?.contains(element)
        )
      })
    }

    function closeOthers(buttonId: string) {
      for (let popover of popovers.value) {
        if (popover.buttonId !== buttonId) popover.close()
      }
    }

    provide(PopoverGroupContext, {
      registerPopover,
      unregisterPopover,
      isFocusWithinPopoverGroup,
      closeOthers,
    })

    return () => {
      let propsWeControl = { ref: groupRef }

      return render({
        props: { ...props, ...propsWeControl },
        slot: {},
        attrs,
        slots,
        name: 'PopoverGroup',
      })
    }
  },
})

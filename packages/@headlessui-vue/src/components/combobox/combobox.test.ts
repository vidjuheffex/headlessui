import {
  DefineComponent,
  defineComponent,
  nextTick,
  ref,
  watch,
  h,
  reactive,
  computed,
  PropType,
} from 'vue'
import { render } from '../../test-utils/vue-testing-library'
import {
  Combobox,
  ComboboxInput,
  ComboboxLabel,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
} from './combobox'
import { suppressConsoleLogs } from '../../test-utils/suppress-console-logs'
import {
  click,
  focus,
  mouseMove,
  mouseLeave,
  press,
  shift,
  type,
  word,
  Keys,
  MouseButton,
} from '../../test-utils/interactions'
import {
  assertActiveElement,
  assertActiveComboboxOption,
  assertComboboxList,
  assertComboboxButton,
  assertComboboxButtonLinkedWithCombobox,
  assertComboboxButtonLinkedWithComboboxLabel,
  assertComboboxOption,
  assertComboboxLabel,
  assertComboboxLabelLinkedWithCombobox,
  assertNoActiveComboboxOption,
  assertNoSelectedComboboxOption,
  getComboboxInput,
  getComboboxButton,
  getComboboxButtons,
  getComboboxInputs,
  getComboboxOptions,
  getComboboxLabel,
  ComboboxState,
  getByText,
  getComboboxes,
} from '../../test-utils/accessibility-assertions'
import { html } from '../../test-utils/html'
import { useOpenClosedProvider, State, useOpenClosed } from '../../internal/open-closed'

jest.mock('../../hooks/use-id')

beforeAll(() => {
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation(setImmediate as any)
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(clearImmediate as any)
})

afterAll(() => jest.restoreAllMocks())

function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve()
      })
    })
  })
}

function getDefaultComponents() {
  return {
    Combobox,
    ComboboxInput,
    ComboboxLabel,
    ComboboxButton,
    ComboboxOptions,
    ComboboxOption,
  }
}

function renderTemplate(input: string | Partial<DefineComponent>) {
  let defaultComponents = getDefaultComponents()

  if (typeof input === 'string') {
    return render(defineComponent({ template: input, components: defaultComponents }))
  }

  return render(
    defineComponent(
      Object.assign({}, input, {
        components: { ...defaultComponents, ...input.components },
      }) as Parameters<typeof defineComponent>[0]
    )
  )
}

describe('safeguards', () => {
  it.each([
    ['ComboboxButton', ComboboxButton],
    ['ComboboxLabel', ComboboxLabel],
    ['ComboboxOptions', ComboboxOptions],
    ['ComboboxOption', ComboboxOption],
  ])(
    'should error when we are using a <%s /> without a parent <Combobox />',
    suppressConsoleLogs((name, Component) => {
      expect(() => render(Component)).toThrowError(
        `<${name} /> is missing a parent <Combobox /> component.`
      )
    })
  )

  it(
    'should be possible to render a Combobox without crashing',
    suppressConsoleLogs(async () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions>
              <ComboboxOption value="a">Option A</ComboboxOption>
              <ComboboxOption value="b">Option B</ComboboxOption>
              <ComboboxOption value="c">Option C</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup: () => ({ value: ref(null) }),
      })

      assertComboboxButton({
        state: ComboboxState.InvisibleUnmounted,
        attributes: { id: 'headlessui-combobox-button-2' },
      })
      assertComboboxList({ state: ComboboxState.InvisibleUnmounted })
    })
  )
})

describe('Rendering', () => {
  describe('Combobox', () => {
    it(
      'should be possible to render a Combobox using a render prop',
      suppressConsoleLogs(async () => {
        renderTemplate({
          template: html`
            <Combobox v-model="value" v-slot="{ open }">
              <ComboboxInput />
              <ComboboxButton>Trigger</ComboboxButton>
              <ComboboxOptions v-show="open">
                <ComboboxOption value="a">Option A</ComboboxOption>
                <ComboboxOption value="b">Option B</ComboboxOption>
                <ComboboxOption value="c">Option C</ComboboxOption>
              </ComboboxOptions>
            </Combobox>
          `,
          setup: () => ({ value: ref(null) }),
        })

        assertComboboxButton({
          state: ComboboxState.InvisibleUnmounted,
          attributes: { id: 'headlessui-combobox-button-2' },
        })
        assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

        await click(getComboboxButton())

        assertComboboxButton({
          state: ComboboxState.Visible,
          attributes: { id: 'headlessui-combobox-button-2' },
        })

        assertComboboxList({ state: ComboboxState.Visible })
      })
    )

    it(
      'should be possible to disable a Combobox',
      suppressConsoleLogs(async () => {
        renderTemplate({
          template: html`
            <Combobox v-model="value" disabled>
              <ComboboxInput />
              <ComboboxButton>Trigger</ComboboxButton>
              <ComboboxOptions>
                <ComboboxOption value="a">Option A</ComboboxOption>
                <ComboboxOption value="b">Option B</ComboboxOption>
                <ComboboxOption value="c">Option C</ComboboxOption>
              </ComboboxOptions>
            </Combobox>
          `,
          setup: () => ({ value: ref(null) }),
        })

        assertComboboxButton({
          state: ComboboxState.InvisibleUnmounted,
          attributes: { id: 'headlessui-combobox-button-2' },
        })
        assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

        await click(getComboboxButton())

        assertComboboxButton({
          state: ComboboxState.InvisibleUnmounted,
          attributes: { id: 'headlessui-combobox-button-2' },
        })
        assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

        await press(Keys.Enter, getComboboxButton())

        assertComboboxButton({
          state: ComboboxState.InvisibleUnmounted,
          attributes: { id: 'headlessui-combobox-button-2' },
        })
        assertComboboxList({ state: ComboboxState.InvisibleUnmounted })
      })
    )
  })

  describe('Combobox.Input', () => {
    it(
      'selecting an option puts the value into Combobox.Input when displayValue is not provided',
      suppressConsoleLogs(async () => {
        let Example = defineComponent({
          template: html`
            <Combobox v-model="value">
              <ComboboxInput />
              <ComboboxButton>Trigger</ComboboxButton>
              <ComboboxOptions>
                <ComboboxOption value="a">Option A</ComboboxOption>
                <ComboboxOption value="b">Option B</ComboboxOption>
                <ComboboxOption value="c">Option C</ComboboxOption>
              </ComboboxOptions>
            </Combobox>
          `,
          setup: () => ({ value: ref(null) }),
        })

        // TODO: Rendering Example directly reveals a vue bug — I think it's been fixed for a while but I can't find the commit
        renderTemplate(Example)

        await click(getComboboxButton())

        assertComboboxList({ state: ComboboxState.Visible })

        await click(getComboboxOptions()[1])

        expect(getComboboxInput()).toHaveValue('b')
      })
    )

    it(
      'selecting an option puts the display value into Combobox.Input when displayValue is provided',
      suppressConsoleLogs(async () => {
        let Example = defineComponent({
          template: html`
            <Combobox v-model="value">
              <ComboboxInput :displayValue="(str) => str?.toUpperCase() ?? ''" />
              <ComboboxButton>Trigger</ComboboxButton>
              <ComboboxOptions>
                <ComboboxOption value="a">Option A</ComboboxOption>
                <ComboboxOption value="b">Option B</ComboboxOption>
                <ComboboxOption value="c">Option C</ComboboxOption>
              </ComboboxOptions>
            </Combobox>
          `,
          setup: () => ({ value: ref(null) }),
        })

        renderTemplate(Example)

        await click(getComboboxButton())

        assertComboboxList({ state: ComboboxState.Visible })

        await click(getComboboxOptions()[1])

        expect(getComboboxInput()).toHaveValue('B')
      })
    )
  })

  describe('ComboboxLabel', () => {
    it(
      'should be possible to render a ComboboxLabel using a render prop',
      suppressConsoleLogs(async () => {
        renderTemplate({
          template: html`
            <Combobox v-model="value">
              <ComboboxLabel v-slot="data">{{JSON.stringify(data)}}</ComboboxLabel>
              <ComboboxInput />
              <ComboboxButton>Trigger</ComboboxButton>
              <ComboboxOptions>
                <ComboboxOption value="a">Option A</ComboboxOption>
                <ComboboxOption value="b">Option B</ComboboxOption>
                <ComboboxOption value="c">Option C</ComboboxOption>
              </ComboboxOptions>
            </Combobox>
          `,
          setup: () => ({ value: ref(null) }),
        })

        assertComboboxButton({
          state: ComboboxState.InvisibleUnmounted,
          attributes: { id: 'headlessui-combobox-button-3' },
        })
        assertComboboxLabel({
          attributes: { id: 'headlessui-combobox-label-1' },
          textContent: JSON.stringify({ open: false, disabled: false }),
        })
        assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

        await click(getComboboxButton())

        assertComboboxLabel({
          attributes: { id: 'headlessui-combobox-label-1' },
          textContent: JSON.stringify({ open: true, disabled: false }),
        })
        assertComboboxList({ state: ComboboxState.Visible })
        assertComboboxLabelLinkedWithCombobox()
        assertComboboxButtonLinkedWithComboboxLabel()
      })
    )

    it(
      'should be possible to render a ComboboxLabel using a render prop and an `as` prop',
      suppressConsoleLogs(async () => {
        renderTemplate({
          template: html`
            <Combobox v-model="value">
              <ComboboxLabel as="p" v-slot="data">{{JSON.stringify(data)}}</ComboboxLabel>
              <ComboboxInput />
              <ComboboxButton>Trigger</ComboboxButton>
              <ComboboxOptions>
                <ComboboxOption value="a">Option A</ComboboxOption>
                <ComboboxOption value="b">Option B</ComboboxOption>
                <ComboboxOption value="c">Option C</ComboboxOption>
              </ComboboxOptions>
            </Combobox>
          `,
          setup: () => ({ value: ref(null) }),
        })

        assertComboboxLabel({
          attributes: { id: 'headlessui-combobox-label-1' },
          textContent: JSON.stringify({ open: false, disabled: false }),
          tag: 'p',
        })
        assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

        await click(getComboboxButton())
        assertComboboxLabel({
          attributes: { id: 'headlessui-combobox-label-1' },
          textContent: JSON.stringify({ open: true, disabled: false }),
          tag: 'p',
        })
        assertComboboxList({ state: ComboboxState.Visible })
      })
    )
  })

  describe('ComboboxButton', () => {
    it(
      'should be possible to render a ComboboxButton using a render prop',
      suppressConsoleLogs(async () => {
        renderTemplate({
          template: html`
            <Combobox v-model="value">
              <ComboboxInput />
              <ComboboxButton v-slot="data">{{JSON.stringify(data)}}</ComboboxButton>
              <ComboboxOptions>
                <ComboboxOption value="a">Option A</ComboboxOption>
                <ComboboxOption value="b">Option B</ComboboxOption>
                <ComboboxOption value="c">Option C</ComboboxOption>
              </ComboboxOptions>
            </Combobox>
          `,
          setup: () => ({ value: ref(null) }),
        })

        assertComboboxButton({
          state: ComboboxState.InvisibleUnmounted,
          attributes: { id: 'headlessui-combobox-button-2' },
          textContent: JSON.stringify({ open: false, disabled: false }),
        })
        assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

        await click(getComboboxButton())

        assertComboboxButton({
          state: ComboboxState.Visible,
          attributes: { id: 'headlessui-combobox-button-2' },
          textContent: JSON.stringify({ open: true, disabled: false }),
        })
        assertComboboxList({ state: ComboboxState.Visible })
      })
    )

    it(
      'should be possible to render a ComboboxButton using a render prop and an `as` prop',
      suppressConsoleLogs(async () => {
        renderTemplate({
          template: html`
            <Combobox v-model="value">
              <ComboboxInput />
              <ComboboxButton as="div" role="button" v-slot="data"
                >{{JSON.stringify(data)}}</ComboboxButton
              >
              <ComboboxOptions>
                <ComboboxOption value="a">Option A</ComboboxOption>
                <ComboboxOption value="b">Option B</ComboboxOption>
                <ComboboxOption value="c">Option C</ComboboxOption>
              </ComboboxOptions>
            </Combobox>
          `,
          setup: () => ({ value: ref(null) }),
        })

        assertComboboxButton({
          state: ComboboxState.InvisibleUnmounted,
          attributes: { id: 'headlessui-combobox-button-2' },
          textContent: JSON.stringify({ open: false, disabled: false }),
        })
        assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

        await click(getComboboxButton())

        assertComboboxButton({
          state: ComboboxState.Visible,
          attributes: { id: 'headlessui-combobox-button-2' },
          textContent: JSON.stringify({ open: true, disabled: false }),
        })
        assertComboboxList({ state: ComboboxState.Visible })
      })
    )

    it(
      'should be possible to render a ComboboxButton and a ComboboxLabel and see them linked together',
      suppressConsoleLogs(async () => {
        renderTemplate({
          template: html`
            <Combobox v-model="value">
              <ComboboxLabel>Label</ComboboxLabel>
              <ComboboxInput />
              <ComboboxButton>Trigger</ComboboxButton>
              <ComboboxOptions>
                <ComboboxOption value="a">Option A</ComboboxOption>
                <ComboboxOption value="b">Option B</ComboboxOption>
                <ComboboxOption value="c">Option C</ComboboxOption>
              </ComboboxOptions>
            </Combobox>
          `,
          setup: () => ({ value: ref(null) }),
        })

        await new Promise(requestAnimationFrame)

        assertComboboxButton({
          state: ComboboxState.InvisibleUnmounted,
          attributes: { id: 'headlessui-combobox-button-3' },
        })
        assertComboboxList({ state: ComboboxState.InvisibleUnmounted })
        assertComboboxButtonLinkedWithComboboxLabel()
      })
    )

    describe('`type` attribute', () => {
      it('should set the `type` to "button" by default', async () => {
        renderTemplate({
          template: html`
            <Combobox v-model="value">
              <ComboboxInput />
              <ComboboxButton>Trigger</ComboboxButton>
            </Combobox>
          `,
          setup: () => ({ value: ref(null) }),
        })

        expect(getComboboxButton()).toHaveAttribute('type', 'button')
      })

      it('should not set the `type` to "button" if it already contains a `type`', async () => {
        renderTemplate({
          template: html`
            <Combobox v-model="value">
              <ComboboxInput />
              <ComboboxButton type="submit"> Trigger </ComboboxButton>
            </Combobox>
          `,
          setup: () => ({ value: ref(null) }),
        })

        expect(getComboboxButton()).toHaveAttribute('type', 'submit')
      })

      it(
        'should set the `type` to "button" when using the `as` prop which resolves to a "button"',
        suppressConsoleLogs(async () => {
          let CustomButton = defineComponent({
            setup: (props) => () => h('button', { ...props }),
          })

          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton :as="CustomButton"> Trigger </ComboboxButton>
              </Combobox>
            `,
            setup: () => ({
              value: ref(null),
              CustomButton,
            }),
          })

          await new Promise(requestAnimationFrame)

          expect(getComboboxButton()).toHaveAttribute('type', 'button')
        })
      )

      it('should not set the type if the "as" prop is not a "button"', async () => {
        renderTemplate({
          template: html`
            <Combobox v-model="value">
              <ComboboxInput />
              <ComboboxButton as="div"> Trigger </ComboboxButton>
            </Combobox>
          `,
          setup: () => ({ value: ref(null) }),
        })

        expect(getComboboxButton()).not.toHaveAttribute('type')
      })

      it(
        'should not set the `type` to "button" when using the `as` prop which resolves to a "div"',
        suppressConsoleLogs(async () => {
          let CustomButton = defineComponent({
            setup: (props) => () => h('div', props),
          })

          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton :as="CustomButton"> Trigger </ComboboxButton>
              </Combobox>
            `,
            setup: () => ({
              value: ref(null),
              CustomButton,
            }),
          })

          await new Promise(requestAnimationFrame)

          expect(getComboboxButton()).not.toHaveAttribute('type')
        })
      )
    })
  })

  describe('ComboboxOptions', () => {
    it(
      'should be possible to render ComboboxOptions using a render prop',
      suppressConsoleLogs(async () => {
        renderTemplate({
          template: html`
            <Combobox v-model="value">
              <ComboboxInput />
              <ComboboxButton>Trigger</ComboboxButton>
              <ComboboxOptions v-slot="data">
                <ComboboxOption value="a">{{JSON.stringify(data)}}</ComboboxOption>
              </ComboboxOptions>
            </Combobox>
          `,
          setup: () => ({ value: ref(null) }),
        })

        assertComboboxButton({
          state: ComboboxState.InvisibleUnmounted,
          attributes: { id: 'headlessui-combobox-button-2' },
        })
        assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

        await click(getComboboxButton())

        assertComboboxButton({
          state: ComboboxState.Visible,
          attributes: { id: 'headlessui-combobox-button-2' },
        })

        assertComboboxList({
          state: ComboboxState.Visible,
          textContent: JSON.stringify({ open: true }),
        })

        assertActiveElement(getComboboxInput())
      })
    )

    it('should be possible to always render the ComboboxOptions if we provide it a `static` prop', () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions static>
              <ComboboxOption value="a">Option A</ComboboxOption>
              <ComboboxOption value="b">Option B</ComboboxOption>
              <ComboboxOption value="c">Option C</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup: () => ({ value: ref(null) }),
      })

      // Let's verify that the combobox is already there
      expect(getComboboxInput()).not.toBe(null)
    })

    it('should be possible to use a different render strategy for the ComboboxOptions', async () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions :unmount="false">
              <ComboboxOption value="a">Option A</ComboboxOption>
              <ComboboxOption value="b">Option B</ComboboxOption>
              <ComboboxOption value="c">Option C</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup: () => ({ value: ref(null) }),
      })

      await new Promise<void>(nextTick)

      assertComboboxList({ state: ComboboxState.InvisibleHidden })

      // Let's open the combobox, to see if it is not hidden anymore
      await click(getComboboxButton())

      assertComboboxList({ state: ComboboxState.Visible })
    })
  })

  describe('ComboboxOption', () => {
    it(
      'should be possible to render a ComboboxOption using a render prop',
      suppressConsoleLogs(async () => {
        renderTemplate({
          template: html`
            <Combobox v-model="value">
              <ComboboxInput />
              <ComboboxButton>Trigger</ComboboxButton>
              <ComboboxOptions>
                <ComboboxOption value="a" v-slot="data">{{JSON.stringify(data)}}</ComboboxOption>
              </ComboboxOptions>
            </Combobox>
          `,
          setup: () => ({ value: ref(null) }),
        })

        assertComboboxButton({
          state: ComboboxState.InvisibleUnmounted,
          attributes: { id: 'headlessui-combobox-button-2' },
        })
        assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

        await click(getComboboxButton())

        assertComboboxButton({
          state: ComboboxState.Visible,
          attributes: { id: 'headlessui-combobox-button-2' },
        })
        assertComboboxList({
          state: ComboboxState.Visible,
          textContent: JSON.stringify({ active: false, selected: false, disabled: false }),
        })
      })
    )
  })

  it('should guarantee the order of DOM nodes when performing actions', async () => {
    let props = reactive({ hide: false })

    renderTemplate({
      template: html`
        <Combobox v-model="value">
          <ComboboxInput />
          <ComboboxButton>Trigger</ComboboxButton>
          <ComboboxOptions>
            <ComboboxOption value="a">Option 1</ComboboxOption>
            <ComboboxOption v-if="!hide" value="b">Option 2</ComboboxOption>
            <ComboboxOption value="c">Option 3</ComboboxOption>
          </ComboboxOptions>
        </Combobox>
      `,
      setup() {
        return {
          value: ref(null),
          get hide() {
            return props.hide
          },
        }
      },
    })

    // Open the combobox
    await click(getByText('Trigger'))

    props.hide = true
    await nextFrame()

    props.hide = false
    await nextFrame()

    assertComboboxList({ state: ComboboxState.Visible })

    let options = getComboboxOptions()

    // Focus the first item
    await press(Keys.ArrowDown)

    // Verify that the first combobox option is active
    assertActiveComboboxOption(options[0])

    await press(Keys.ArrowDown)

    // Verify that the second combobox option is active
    assertActiveComboboxOption(options[1])

    await press(Keys.ArrowDown)

    // Verify that the third combobox option is active
    assertActiveComboboxOption(options[2])
  })
})

describe('Rendering composition', () => {
  it(
    'should be possible to swap the Combobox option with a button for example',
    suppressConsoleLogs(async () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions>
              <ComboboxOption as="button" value="a"> Option A </ComboboxOption>
              <ComboboxOption as="button" value="b"> Option B </ComboboxOption>
              <ComboboxOption as="button" value="c"> Option C </ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup: () => ({ value: ref(null) }),
      })

      assertComboboxButton({
        state: ComboboxState.InvisibleUnmounted,
        attributes: { id: 'headlessui-combobox-button-2' },
      })
      assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

      // Open combobox
      await click(getComboboxButton())

      // Verify options are buttons now
      getComboboxOptions().forEach((option) => assertComboboxOption(option, { tag: 'button' }))
    })
  )

  it(
    'should mark all the elements between Combobox.Options and Combobox.Option with role none',
    suppressConsoleLogs(async () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxInput />
            <ComboboxButton />
            <div class="outer">
              <ComboboxOptions>
                <div class="inner py-1">
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                </div>
                <div class="inner py-1">
                  <ComboboxOption value="c">Option C</ComboboxOption>
                  <ComboboxOption value="d">
                    <div>
                      <div class="outer">Option D</div>
                    </div>
                  </ComboboxOption>
                </div>
                <div class="inner py-1">
                  <form class="inner">
                    <ComboboxOption value="e">Option E</ComboboxOption>
                  </form>
                </div>
              </ComboboxOptions>
            </div>
          </Combobox>
        `,
        setup: () => ({ value: ref(null) }),
      })

      // Open combobox
      await click(getComboboxButton())

      expect.hasAssertions()

      document.querySelectorAll('.outer').forEach((element) => {
        expect(element).not.toHaveAttribute('role', 'none')
      })

      document.querySelectorAll('.inner').forEach((element) => {
        expect(element).toHaveAttribute('role', 'none')
      })
    })
  )
})

describe('Composition', () => {
  let OpenClosedWrite = defineComponent({
    props: { open: { type: Boolean } },
    setup(props, { slots }) {
      useOpenClosedProvider(ref(props.open ? State.Open : State.Closed))
      return () => slots.default?.()
    },
  })

  let OpenClosedRead = defineComponent({
    emits: ['read'],
    setup(_, { slots, emit }) {
      let state = useOpenClosed()
      watch([state], ([value]) => emit('read', value))
      return () => slots.default?.()
    },
  })

  it(
    'should always open the ComboboxOptions because of a wrapping OpenClosed component',
    suppressConsoleLogs(async () => {
      renderTemplate({
        components: { OpenClosedWrite },
        template: html`
          <Combobox>
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <OpenClosedWrite :open="true">
              <ComboboxOptions v-slot="data"> {{JSON.stringify(data)}} </ComboboxOptions>
            </OpenClosedWrite>
          </Combobox>
        `,
      })

      await new Promise<void>(nextTick)

      // Verify the combobox is visible
      assertComboboxList({ state: ComboboxState.Visible })

      // Let's try and open the combobox
      await click(getComboboxButton())

      // Verify the combobox is still visible
      assertComboboxList({ state: ComboboxState.Visible })
    })
  )

  it(
    'should always close the ComboboxOptions because of a wrapping OpenClosed component',
    suppressConsoleLogs(async () => {
      renderTemplate({
        components: { OpenClosedWrite },
        template: html`
          <Combobox>
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <OpenClosedWrite :open="false">
              <ComboboxOptions v-slot="data"> {{JSON.stringify(data)}} </ComboboxOptions>
            </OpenClosedWrite>
          </Combobox>
        `,
      })

      await new Promise<void>(nextTick)

      // Verify the combobox is hidden
      assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

      // Let's try and open the combobox
      await click(getComboboxButton())

      // Verify the combobox is still hidden
      assertComboboxList({ state: ComboboxState.InvisibleUnmounted })
    })
  )

  it(
    'should be possible to read the OpenClosed state',
    suppressConsoleLogs(async () => {
      let readFn = jest.fn()
      renderTemplate({
        components: { OpenClosedRead },
        template: html`
          <Combobox v-model="value">
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <OpenClosedRead @read="readFn">
              <ComboboxOptions>
                <ComboboxOption value="a">Option A</ComboboxOption>
              </ComboboxOptions>
            </OpenClosedRead>
          </Combobox>
        `,
        setup() {
          return { value: ref(null), readFn }
        },
      })

      await new Promise<void>(nextTick)

      // Verify the combobox is hidden
      assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

      // Let's toggle the combobox 3 times
      await click(getComboboxButton())
      await click(getComboboxButton())
      await click(getComboboxButton())

      // Verify the combobox is visible
      assertComboboxList({ state: ComboboxState.Visible })

      expect(readFn).toHaveBeenCalledTimes(3)
      expect(readFn).toHaveBeenNthCalledWith(1, State.Open)
      expect(readFn).toHaveBeenNthCalledWith(2, State.Closed)
      expect(readFn).toHaveBeenNthCalledWith(3, State.Open)
    })
  )
})

describe('Keyboard interactions', () => {
  describe('Button', () => {
    describe('`Enter` key', () => {
      it(
        'should be possible to open the Combobox with Enter',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Focus the button
          getComboboxButton()?.focus()

          // Open combobox
          await press(Keys.Enter)

          // Verify we moved focus to the input field
          assertActiveElement(getComboboxInput())

          // Verify it is visible
          assertComboboxButton({ state: ComboboxState.Visible })
          assertComboboxList({
            state: ComboboxState.Visible,
            attributes: { id: 'headlessui-combobox-options-3' },
          })
          assertActiveElement(getComboboxInput())
          assertComboboxButtonLinkedWithCombobox()

          // Verify we have combobox options
          let options = getComboboxOptions()
          expect(options).toHaveLength(3)
          options.forEach((option) => assertComboboxOption(option, { selected: false }))

          assertNoActiveComboboxOption()
          assertNoSelectedComboboxOption()
        })
      )

      it(
        'should not be possible to open the combobox with Enter when the button is disabled',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value" disabled>
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Try to focus the button
          getComboboxButton()?.focus()

          // Try to open the combobox
          await press(Keys.Enter)

          // Verify it is still closed
          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })
        })
      )

      it(
        'should be possible to open the combobox with Enter, and focus the selected option',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref('b') }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Focus the button
          getComboboxButton()?.focus()

          // Open combobox
          await press(Keys.Enter)

          // Verify we moved focus to the input field
          assertActiveElement(getComboboxInput())

          // Verify it is visible
          assertComboboxButton({ state: ComboboxState.Visible })
          assertComboboxList({
            state: ComboboxState.Visible,
            attributes: { id: 'headlessui-combobox-options-3' },
          })
          assertActiveElement(getComboboxInput())
          assertComboboxButtonLinkedWithCombobox()

          // Verify we have combobox options
          let options = getComboboxOptions()
          expect(options).toHaveLength(3)
          options.forEach((option, i) => assertComboboxOption(option, { selected: i === 1 }))

          // Verify that the second combobox option is active (because it is already selected)
          assertActiveComboboxOption(options[1])
        })
      )

      it(
        'should be possible to open the combobox with Enter, and focus the selected option (when using the `hidden` render strategy)',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions :unmount="false">
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref('b') }),
          })

          await new Promise<void>(nextTick)

          assertComboboxButton({
            state: ComboboxState.InvisibleHidden,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleHidden })

          // Focus the button
          getComboboxButton()?.focus()

          // Open combobox
          await press(Keys.Enter)

          // Verify we moved focus to the input field
          assertActiveElement(getComboboxInput())

          // Verify it is visible
          assertComboboxButton({ state: ComboboxState.Visible })
          assertComboboxList({
            state: ComboboxState.Visible,
            attributes: { id: 'headlessui-combobox-options-3' },
          })
          assertActiveElement(getComboboxInput())
          assertComboboxButtonLinkedWithCombobox()

          let options = getComboboxOptions()

          // Hover over Option A
          await mouseMove(options[0])

          // Verify that Option A is active
          assertActiveComboboxOption(options[0])

          // Verify that Option B is still selected
          assertComboboxOption(options[1], { selected: true })

          // Close/Hide the combobox
          await press(Keys.Escape)

          // Re-open the combobox
          await click(getComboboxButton())

          // Verify we have combobox options
          expect(options).toHaveLength(3)
          options.forEach((option, i) => assertComboboxOption(option, { selected: i === 1 }))

          // Verify that the second combobox option is active (because it is already selected)
          assertActiveComboboxOption(options[1])
        })
      )

      it(
        'should be possible to open the combobox with Enter, and focus the selected option (with a list of objects)',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption v-for="option in options" key="option.id" :value="option"
                    >{{ option.name }}</ComboboxOption
                  >
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => {
              let options = [
                { id: 'a', name: 'Option A' },
                { id: 'b', name: 'Option B' },
                { id: 'c', name: 'Option C' },
              ]
              let value = ref(options[1])

              return { value, options }
            },
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Focus the button
          getComboboxButton()?.focus()

          // Open combobox
          await press(Keys.Enter)

          // Verify we moved focus to the input field
          assertActiveElement(getComboboxInput())

          // Verify it is visible
          assertComboboxButton({ state: ComboboxState.Visible })
          assertComboboxList({
            state: ComboboxState.Visible,
            attributes: { id: 'headlessui-combobox-options-3' },
          })
          assertActiveElement(getComboboxInput())
          assertComboboxButtonLinkedWithCombobox()

          // Verify we have combobox options
          let options = getComboboxOptions()
          expect(options).toHaveLength(3)
          options.forEach((option, i) => assertComboboxOption(option, { selected: i === 1 }))

          // Verify that the second combobox option is active (because it is already selected)
          assertActiveComboboxOption(options[1])
        })
      )

      it(
        'should have no active combobox option when there are no combobox options at all',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions />
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Focus the button
          getComboboxButton()?.focus()

          // Open combobox
          await press(Keys.Enter)

          // Verify we moved focus to the input field
          assertActiveElement(getComboboxInput())

          assertComboboxList({ state: ComboboxState.Visible })
          assertActiveElement(getComboboxInput())

          assertNoActiveComboboxOption()
        })
      )
    })

    describe('`Space` key', () => {
      it(
        'should be possible to open the combobox with Space',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Focus the button
          getComboboxButton()?.focus()

          // Open combobox
          await press(Keys.Space)

          // Verify we moved focus to the input field
          assertActiveElement(getComboboxInput())

          // Verify it is visible
          assertComboboxButton({ state: ComboboxState.Visible })
          assertComboboxList({
            state: ComboboxState.Visible,
            attributes: { id: 'headlessui-combobox-options-3' },
          })
          assertActiveElement(getComboboxInput())
          assertComboboxButtonLinkedWithCombobox()

          // Verify we have combobox options
          let options = getComboboxOptions()
          expect(options).toHaveLength(3)
          options.forEach((option) => assertComboboxOption(option))
          assertNoActiveComboboxOption()
        })
      )

      it(
        'should not be possible to open the combobox with Space when the button is disabled',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value" disabled>
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Focus the button
          getComboboxButton()?.focus()

          // Try to open the combobox
          await press(Keys.Space)

          // Verify it is still closed
          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })
        })
      )

      it(
        'should be possible to open the combobox with Space, and focus the selected option',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref('b') }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({
            state: ComboboxState.InvisibleUnmounted,
          })

          // Focus the button
          getComboboxButton()?.focus()

          // Open combobox
          await press(Keys.Space)

          // Verify it is visible
          assertComboboxButton({ state: ComboboxState.Visible })
          assertComboboxList({
            state: ComboboxState.Visible,
            attributes: { id: 'headlessui-combobox-options-3' },
          })
          assertActiveElement(getComboboxInput())
          assertComboboxButtonLinkedWithCombobox()

          // Verify we have combobox options
          let options = getComboboxOptions()
          expect(options).toHaveLength(3)
          options.forEach((option, i) => assertComboboxOption(option, { selected: i === 1 }))

          // Verify that the second combobox option is active (because it is already selected)
          assertActiveComboboxOption(options[1])
        })
      )

      it(
        'should have no active combobox option when there are no combobox options at all',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions />
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxList({
            state: ComboboxState.InvisibleUnmounted,
          })

          // Focus the button
          getComboboxButton()?.focus()

          // Open combobox
          await press(Keys.Space)
          assertComboboxList({ state: ComboboxState.Visible })
          assertActiveElement(getComboboxInput())

          assertNoActiveComboboxOption()
        })
      )

      it(
        'should have no active combobox option upon Space key press, when there are no non-disabled combobox options',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption disabled value="a"> Option A </ComboboxOption>
                  <ComboboxOption disabled value="b"> Option B </ComboboxOption>
                  <ComboboxOption disabled value="c"> Option C </ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({
            state: ComboboxState.InvisibleUnmounted,
          })

          // Focus the button
          getComboboxButton()?.focus()

          // Open combobox
          await press(Keys.Space)

          assertNoActiveComboboxOption()
        })
      )
    })

    describe('`Escape` key', () => {
      it(
        'should be possible to close an open combobox with Escape',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          // Open combobox
          await click(getComboboxButton())

          // Verify it is visible
          assertComboboxButton({ state: ComboboxState.Visible })
          assertComboboxList({
            state: ComboboxState.Visible,
            attributes: { id: 'headlessui-combobox-options-3' },
          })
          assertActiveElement(getComboboxInput())
          assertComboboxButtonLinkedWithCombobox()

          // Re-focus the button
          getComboboxButton()?.focus()
          assertActiveElement(getComboboxButton())

          // Close combobox
          await press(Keys.Escape)

          // Verify it is closed
          assertComboboxButton({ state: ComboboxState.InvisibleUnmounted })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Verify the input is focused again
          assertActiveElement(getComboboxInput())
        })
      )

      it(
        'Static options should allow escape to bubble',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions static>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          let spy = jest.fn()

          window.addEventListener(
            'keydown',
            (evt) => {
              if (evt.key === 'Escape') {
                spy()
              }
            },
            { capture: true }
          )

          window.addEventListener('keydown', (evt) => {
            if (evt.key === 'Escape') {
              spy()
            }
          })

          // Open combobox
          await click(getComboboxButton())

          // Verify it is visible
          assertComboboxButton({ state: ComboboxState.Visible })
          assertComboboxList({
            state: ComboboxState.Visible,
            attributes: { id: 'headlessui-combobox-options-3' },
          })
          assertActiveElement(getComboboxInput())
          assertComboboxButtonLinkedWithCombobox()

          // Re-focus the button
          getComboboxButton()?.focus()
          assertActiveElement(getComboboxButton())

          // Close combobox
          await press(Keys.Escape)

          // TODO: Verify it is rendered — with static it's not visible or invisible from an assert perspective
          // assertComboboxButton({ state: ComboboxState.InvisibleUnmounted })
          // assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Verify the input is focused again
          assertActiveElement(getComboboxInput())

          // The external event handler should've been called twice
          // Once in the capture phase and once in the bubble phase
          expect(spy).toHaveBeenCalledTimes(2)
        })
      )
    })

    describe('`ArrowDown` key', () => {
      it(
        'should be possible to open the combobox with ArrowDown',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref('test') }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Focus the button
          getComboboxButton()?.focus()

          // Open combobox
          await press(Keys.ArrowDown)

          // Verify it is visible
          assertComboboxButton({ state: ComboboxState.Visible })
          assertComboboxList({
            state: ComboboxState.Visible,
            attributes: { id: 'headlessui-combobox-options-3' },
          })
          assertActiveElement(getComboboxInput())
          assertComboboxButtonLinkedWithCombobox()

          // Verify we have combobox options
          let options = getComboboxOptions()
          expect(options).toHaveLength(3)
          options.forEach((option) => assertComboboxOption(option))

          // Verify that the first combobox option is active
          assertNoActiveComboboxOption()
        })
      )

      it(
        'should not be possible to open the combobox with ArrowDown when the button is disabled',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value" disabled>
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Focus the button
          getComboboxButton()?.focus()

          // Try to open the combobox
          await press(Keys.ArrowDown)

          // Verify it is still closed
          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })
        })
      )

      it(
        'should be possible to open the combobox with ArrowDown, and focus the selected option',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref('b') }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Focus the button
          getComboboxButton()?.focus()

          // Open combobox
          await press(Keys.ArrowDown)

          // Verify it is visible
          assertComboboxButton({ state: ComboboxState.Visible })
          assertComboboxList({
            state: ComboboxState.Visible,
            attributes: { id: 'headlessui-combobox-options-3' },
          })
          assertActiveElement(getComboboxInput())
          assertComboboxButtonLinkedWithCombobox()

          // Verify we have combobox options
          let options = getComboboxOptions()
          expect(options).toHaveLength(3)
          options.forEach((option, i) => assertComboboxOption(option, { selected: i === 1 }))

          // Verify that the second combobox option is active (because it is already selected)
          assertActiveComboboxOption(options[1])
        })
      )

      it(
        'should have no active combobox option when there are no combobox options at all',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions />
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Focus the button
          getComboboxButton()?.focus()

          // Open combobox
          await press(Keys.ArrowDown)
          assertComboboxList({ state: ComboboxState.Visible })
          assertActiveElement(getComboboxInput())

          assertNoActiveComboboxOption()
        })
      )
    })

    describe('`ArrowUp` key', () => {
      it(
        'should be possible to open the combobox with ArrowUp and the last option should be active',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Focus the button
          getComboboxButton()?.focus()

          // Open combobox
          await press(Keys.ArrowUp)

          // Verify it is visible
          assertComboboxButton({ state: ComboboxState.Visible })
          assertComboboxList({
            state: ComboboxState.Visible,
            attributes: { id: 'headlessui-combobox-options-3' },
          })
          assertActiveElement(getComboboxInput())
          assertComboboxButtonLinkedWithCombobox()

          // Verify we have combobox options
          let options = getComboboxOptions()
          expect(options).toHaveLength(3)
          options.forEach((option) => assertComboboxOption(option))

          // ! ALERT: The LAST option should now be active
          assertActiveComboboxOption(options[2])
        })
      )

      it(
        'should not be possible to open the combobox with ArrowUp and the last option should be active when the button is disabled',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value" disabled>
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Focus the button
          getComboboxButton()?.focus()

          // Try to open the combobox
          await press(Keys.ArrowUp)

          // Verify it is still closed
          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })
        })
      )

      it(
        'should be possible to open the combobox with ArrowUp, and focus the selected option',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref('b') }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Focus the button
          getComboboxButton()?.focus()

          // Open combobox
          await press(Keys.ArrowUp)

          // Verify it is visible
          assertComboboxButton({ state: ComboboxState.Visible })
          assertComboboxList({
            state: ComboboxState.Visible,
            attributes: { id: 'headlessui-combobox-options-3' },
          })
          assertActiveElement(getComboboxInput())
          assertComboboxButtonLinkedWithCombobox()

          // Verify we have combobox options
          let options = getComboboxOptions()
          expect(options).toHaveLength(3)
          options.forEach((option, i) => assertComboboxOption(option, { selected: i === 1 }))

          // Verify that the second combobox option is active (because it is already selected)
          assertActiveComboboxOption(options[1])
        })
      )

      it(
        'should have no active combobox option when there are no combobox options at all',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions />
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Focus the button
          getComboboxButton()?.focus()

          // Open combobox
          await press(Keys.ArrowUp)
          assertComboboxList({ state: ComboboxState.Visible })
          assertActiveElement(getComboboxInput())

          assertNoActiveComboboxOption()
        })
      )

      it(
        'should be possible to use ArrowUp to navigate the combobox options and jump to the first non-disabled one',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption disabled value="b"> Option B </ComboboxOption>
                  <ComboboxOption disabled value="c"> Option C </ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Focus the button
          getComboboxButton()?.focus()

          // Open combobox
          await press(Keys.ArrowUp)

          // Verify we have combobox options
          let options = getComboboxOptions()
          expect(options).toHaveLength(3)
          options.forEach((option) => assertComboboxOption(option))
          assertActiveComboboxOption(options[0])
        })
      )
    })
  })

  describe('Input', () => {
    describe('`Enter` key', () => {
      it(
        'should be possible to close the combobox with Enter and choose the active combobox option',
        suppressConsoleLogs(async () => {
          let handleChange = jest.fn()
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup() {
              let value = ref(null)
              watch([value], () => handleChange(value.value))
              return { value }
            },
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Open combobox
          await click(getComboboxButton())

          // Verify it is visible
          assertComboboxButton({ state: ComboboxState.Visible })

          // Activate the first combobox option
          let options = getComboboxOptions()
          await mouseMove(options[0])

          // Choose option, and close combobox
          await press(Keys.Enter)

          // Verify it is closed
          assertComboboxButton({ state: ComboboxState.InvisibleUnmounted })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Verify we got the change event
          expect(handleChange).toHaveBeenCalledTimes(1)
          expect(handleChange).toHaveBeenCalledWith('a')

          // Verify the button is focused again
          assertActiveElement(getComboboxInput())

          // Open combobox again
          await click(getComboboxButton())

          // Verify the active option is the previously selected one
          assertActiveComboboxOption(getComboboxOptions()[0])
        })
      )
    })

    describe('`Tab` key', () => {
      it(
        'pressing Tab should select the active item and move to the next DOM node',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <input id="before-combobox" />
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
              <input id="after-combobox" />
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Open combobox
          await click(getComboboxButton())

          // Select the 2nd option
          await press(Keys.ArrowDown)
          await press(Keys.ArrowDown)

          // Tab to the next DOM node
          await press(Keys.Tab)

          // Verify it is closed
          assertComboboxButton({ state: ComboboxState.InvisibleUnmounted })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // That the selected value was the highlighted one
          expect(getComboboxInput()?.value).toBe('b')

          // And focus has moved to the next element
          assertActiveElement(document.querySelector('#after-combobox'))
        })
      )

      it(
        'pressing Shift+Tab should select the active item and move to the previous DOM node',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <input id="before-combobox" />
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
              <input id="after-combobox" />
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Open combobox
          await click(getComboboxButton())

          // Select the 2nd option
          await press(Keys.ArrowDown)
          await press(Keys.ArrowDown)

          // Tab to the next DOM node
          await press(shift(Keys.Tab))

          // Verify it is closed
          assertComboboxButton({ state: ComboboxState.InvisibleUnmounted })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // That the selected value was the highlighted one
          expect(getComboboxInput()?.value).toBe('b')

          // And focus has moved to the next element
          assertActiveElement(document.querySelector('#before-combobox'))
        })
      )
    })

    describe('`Escape` key', () => {
      it(
        'should be possible to close an open combobox with Escape',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          // Open combobox
          await click(getComboboxButton())

          // Verify it is visible
          assertComboboxButton({ state: ComboboxState.Visible })
          assertComboboxList({
            state: ComboboxState.Visible,
            attributes: { id: 'headlessui-combobox-options-3' },
          })
          assertActiveElement(getComboboxInput())
          assertComboboxButtonLinkedWithCombobox()

          // Close combobox
          await press(Keys.Escape)

          // Verify it is closed
          assertComboboxButton({ state: ComboboxState.InvisibleUnmounted })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Verify the button is focused again
          assertActiveElement(getComboboxInput())
        })
      )
    })

    describe('`ArrowDown` key', () => {
      it(
        'should be possible to open the combobox with ArrowDown',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref('test') }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Focus the input
          getComboboxInput()?.focus()

          // Open combobox
          await press(Keys.ArrowDown)

          // Verify it is visible
          assertComboboxButton({ state: ComboboxState.Visible })
          assertComboboxList({
            state: ComboboxState.Visible,
            attributes: { id: 'headlessui-combobox-options-3' },
          })
          assertActiveElement(getComboboxInput())
          assertComboboxButtonLinkedWithCombobox()

          // Verify we have combobox options
          let options = getComboboxOptions()
          expect(options).toHaveLength(3)
          options.forEach((option) => assertComboboxOption(option))

          // Verify that the first combobox option is active
          assertNoActiveComboboxOption()
        })
      )

      it(
        'should not be possible to open the combobox with ArrowDown when the button is disabled',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value" disabled>
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Focus the input
          getComboboxInput()?.focus()

          // Try to open the combobox
          await press(Keys.ArrowDown)

          // Verify it is still closed
          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })
        })
      )

      it(
        'should be possible to open the combobox with ArrowDown, and focus the selected option',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref('b') }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Focus the input
          getComboboxInput()?.focus()

          // Open combobox
          await press(Keys.ArrowDown)

          // Verify it is visible
          assertComboboxButton({ state: ComboboxState.Visible })
          assertComboboxList({
            state: ComboboxState.Visible,
            attributes: { id: 'headlessui-combobox-options-3' },
          })
          assertActiveElement(getComboboxInput())
          assertComboboxButtonLinkedWithCombobox()

          // Verify we have combobox options
          let options = getComboboxOptions()
          expect(options).toHaveLength(3)
          options.forEach((option, i) => assertComboboxOption(option, { selected: i === 1 }))

          // Verify that the second combobox option is active (because it is already selected)
          assertActiveComboboxOption(options[1])
        })
      )

      it(
        'should have no active combobox option when there are no combobox options at all',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions />
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Focus the input
          getComboboxInput()?.focus()

          // Open combobox
          await press(Keys.ArrowDown)
          assertComboboxList({ state: ComboboxState.Visible })
          assertActiveElement(getComboboxInput())

          assertNoActiveComboboxOption()
        })
      )

      it(
        'should be possible to use ArrowDown to navigate the combobox options',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Open combobox
          await click(getComboboxButton())

          // Verify we have combobox options
          let options = getComboboxOptions()
          expect(options).toHaveLength(3)
          options.forEach((option) => assertComboboxOption(option))
          assertNoActiveComboboxOption()

          // We should be able to go down once
          await press(Keys.ArrowDown)
          assertActiveComboboxOption(options[0])

          // We should be able to go down again
          await press(Keys.ArrowDown)
          assertActiveComboboxOption(options[1])

          // We should be able to go down again
          await press(Keys.ArrowDown)
          assertActiveComboboxOption(options[2])

          // We should NOT be able to go down again (because last option). Current implementation won't go around.
          await press(Keys.ArrowDown)
          assertActiveComboboxOption(options[2])
        })
      )

      it(
        'should be possible to use ArrowDown to navigate the combobox options and skip the first disabled one',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption disabled value="a"> Option A </ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Open combobox
          await click(getComboboxButton())

          // Verify we have combobox options
          let options = getComboboxOptions()
          expect(options).toHaveLength(3)
          options.forEach((option) => assertComboboxOption(option))
          assertNoActiveComboboxOption()

          // We should be able to go down once
          await press(Keys.ArrowDown)
          assertActiveComboboxOption(options[1])
        })
      )

      it(
        'should be possible to use ArrowDown to navigate the combobox options and jump to the first non-disabled one',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption disabled value="a"> Option A </ComboboxOption>
                  <ComboboxOption disabled value="b"> Option B </ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Open combobox
          await click(getComboboxButton())

          // Verify we have combobox options
          let options = getComboboxOptions()
          expect(options).toHaveLength(3)
          options.forEach((option) => assertComboboxOption(option))
          assertNoActiveComboboxOption()

          // Open combobox
          await press(Keys.ArrowDown)
          assertActiveComboboxOption(options[2])
        })
      )
    })

    describe('`ArrowUp` key', () => {
      it(
        'should be possible to open the combobox with ArrowUp and the last option should be active',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Focus the input
          getComboboxInput()?.focus()

          // Open combobox
          await press(Keys.ArrowUp)

          // Verify it is visible
          assertComboboxButton({ state: ComboboxState.Visible })
          assertComboboxList({
            state: ComboboxState.Visible,
            attributes: { id: 'headlessui-combobox-options-3' },
          })
          assertActiveElement(getComboboxInput())
          assertComboboxButtonLinkedWithCombobox()

          // Verify we have combobox options
          let options = getComboboxOptions()
          expect(options).toHaveLength(3)
          options.forEach((option) => assertComboboxOption(option))

          // ! ALERT: The LAST option should now be active
          assertActiveComboboxOption(options[2])
        })
      )

      it(
        'should not be possible to open the combobox with ArrowUp and the last option should be active when the button is disabled',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value" disabled>
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Focus the input
          getComboboxInput()?.focus()

          // Try to open the combobox
          await press(Keys.ArrowUp)

          // Verify it is still closed
          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })
        })
      )

      it(
        'should be possible to open the combobox with ArrowUp, and focus the selected option',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref('b') }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Focus the input
          getComboboxInput()?.focus()

          // Open combobox
          await press(Keys.ArrowUp)

          // Verify it is visible
          assertComboboxButton({ state: ComboboxState.Visible })
          assertComboboxList({
            state: ComboboxState.Visible,
            attributes: { id: 'headlessui-combobox-options-3' },
          })
          assertActiveElement(getComboboxInput())
          assertComboboxButtonLinkedWithCombobox()

          // Verify we have combobox options
          let options = getComboboxOptions()
          expect(options).toHaveLength(3)
          options.forEach((option, i) => assertComboboxOption(option, { selected: i === 1 }))

          // Verify that the second combobox option is active (because it is already selected)
          assertActiveComboboxOption(options[1])
        })
      )

      it(
        'should have no active combobox option when there are no combobox options at all',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions />
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Focus the input
          getComboboxInput()?.focus()

          // Open combobox
          await press(Keys.ArrowUp)
          assertComboboxList({ state: ComboboxState.Visible })
          assertActiveElement(getComboboxInput())

          assertNoActiveComboboxOption()
        })
      )

      it(
        'should be possible to use ArrowUp to navigate the combobox options and jump to the first non-disabled one',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption disabled value="b"> Option B </ComboboxOption>
                  <ComboboxOption disabled value="c"> Option C </ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Focus the input
          getComboboxInput()?.focus()

          // Open combobox
          await press(Keys.ArrowUp)

          // Verify we have combobox options
          let options = getComboboxOptions()
          expect(options).toHaveLength(3)
          options.forEach((option) => assertComboboxOption(option))
          assertActiveComboboxOption(options[0])
        })
      )

      it(
        'should not be possible to navigate up or down if there is only a single non-disabled option',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption disabled value="a"> Option A </ComboboxOption>
                  <ComboboxOption disabled value="b"> Option B </ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Open combobox
          await click(getComboboxButton())

          // Verify we have combobox options
          let options = getComboboxOptions()
          expect(options).toHaveLength(3)
          options.forEach((option) => assertComboboxOption(option))
          assertNoActiveComboboxOption()

          // Going up or down should select the single available option
          await press(Keys.ArrowUp)

          // We should not be able to go up (because those are disabled)
          await press(Keys.ArrowUp)
          assertActiveComboboxOption(options[2])

          // We should not be able to go down (because this is the last option)
          await press(Keys.ArrowDown)
          assertActiveComboboxOption(options[2])
        })
      )

      it(
        'should be possible to use ArrowUp to navigate the combobox options',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          assertComboboxButton({
            state: ComboboxState.InvisibleUnmounted,
            attributes: { id: 'headlessui-combobox-button-2' },
          })
          assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

          // Focus the input
          getComboboxInput()?.focus()

          // Open combobox
          await press(Keys.ArrowUp)

          // Verify it is visible
          assertComboboxButton({ state: ComboboxState.Visible })
          assertComboboxList({
            state: ComboboxState.Visible,
            attributes: { id: 'headlessui-combobox-options-3' },
          })
          assertActiveElement(getComboboxInput())
          assertComboboxButtonLinkedWithCombobox()

          // Verify we have combobox options
          let options = getComboboxOptions()
          expect(options).toHaveLength(3)
          options.forEach((option) => assertComboboxOption(option))
          assertActiveComboboxOption(options[2])

          // We should be able to go down once
          await press(Keys.ArrowUp)
          assertActiveComboboxOption(options[1])

          // We should be able to go down again
          await press(Keys.ArrowUp)
          assertActiveComboboxOption(options[0])

          // We should NOT be able to go up again (because first option). Current implementation won't go around.
          await press(Keys.ArrowUp)
          assertActiveComboboxOption(options[0])
        })
      )
    })

    describe('`End` key', () => {
      it(
        'should be possible to use the End key to go to the last combobox option',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          // Open combobox
          await click(getComboboxButton())

          let options = getComboboxOptions()

          // We should have no option selected
          assertNoActiveComboboxOption()

          // We should be able to go to the last option
          await press(Keys.End)
          assertActiveComboboxOption(options[2])
        })
      )

      it(
        'should be possible to use the End key to go to the last non disabled combobox option',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption disabled value="c"> Option C </ComboboxOption>
                  <ComboboxOption disabled value="d"> Option D </ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          // Open combobox
          await click(getComboboxButton())

          let options = getComboboxOptions()

          // We should have no option selected
          assertNoActiveComboboxOption()

          // We should be able to go to the last non-disabled option
          await press(Keys.End)
          assertActiveComboboxOption(options[1])
        })
      )

      it(
        'should be possible to use the End key to go to the first combobox option if that is the only non-disabled combobox option',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption disabled value="b"> Option B </ComboboxOption>
                  <ComboboxOption disabled value="c"> Option C </ComboboxOption>
                  <ComboboxOption disabled value="d"> Option D </ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          // Open combobox
          await click(getComboboxButton())

          // We opened via click, we don't have an active option
          assertNoActiveComboboxOption()

          // We should not be able to go to the end
          await press(Keys.End)

          let options = getComboboxOptions()
          assertActiveComboboxOption(options[0])
        })
      )

      it(
        'should have no active combobox option upon End key press, when there are no non-disabled combobox options',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption disabled value="a"> Option A </ComboboxOption>
                  <ComboboxOption disabled value="b"> Option B </ComboboxOption>
                  <ComboboxOption disabled value="c"> Option C </ComboboxOption>
                  <ComboboxOption disabled value="d"> Option D </ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          // Open combobox
          await click(getComboboxButton())

          // We opened via click, we don't have an active option
          assertNoActiveComboboxOption()

          // We should not be able to go to the end
          await press(Keys.End)

          assertNoActiveComboboxOption()
        })
      )
    })

    describe('`PageDown` key', () => {
      it(
        'should be possible to use the PageDown key to go to the last combobox option',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          // Open combobox
          await click(getComboboxButton())

          let options = getComboboxOptions()

          // We should be on the first option
          assertNoActiveComboboxOption()

          // We should be able to go to the last option
          await press(Keys.PageDown)
          assertActiveComboboxOption(options[2])
        })
      )

      it(
        'should be possible to use the PageDown key to go to the last non disabled Combobox option',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption disabled value="c"> Option C </ComboboxOption>
                  <ComboboxOption disabled value="d"> Option D </ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          // Open combobox
          await click(getComboboxButton())

          // Open combobox
          await press(Keys.Space)

          let options = getComboboxOptions()

          // We should have nothing active
          assertNoActiveComboboxOption()

          // We should be able to go to the last non-disabled option
          await press(Keys.PageDown)
          assertActiveComboboxOption(options[1])
        })
      )

      it(
        'should be possible to use the PageDown key to go to the first combobox option if that is the only non-disabled combobox option',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption disabled value="b"> Option B </ComboboxOption>
                  <ComboboxOption disabled value="c"> Option C </ComboboxOption>
                  <ComboboxOption disabled value="d"> Option D </ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          // Open combobox
          await click(getComboboxButton())

          // We opened via click, we don't have an active option
          assertNoActiveComboboxOption()

          // We should not be able to go to the end
          await press(Keys.PageDown)

          let options = getComboboxOptions()
          assertActiveComboboxOption(options[0])
        })
      )

      it(
        'should have no active combobox option upon PageDown key press, when there are no non-disabled combobox options',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption disabled value="a"> Option A </ComboboxOption>
                  <ComboboxOption disabled value="b"> Option B </ComboboxOption>
                  <ComboboxOption disabled value="c"> Option C </ComboboxOption>
                  <ComboboxOption disabled value="d"> Option D </ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          // Open combobox
          await click(getComboboxButton())

          // We opened via click, we don't have an active option
          assertNoActiveComboboxOption()

          // We should not be able to go to the end
          await press(Keys.PageDown)

          assertNoActiveComboboxOption()
        })
      )
    })

    describe('`Home` key', () => {
      it(
        'should be possible to use the Home key to go to the first combobox option',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          // Focus the input
          getComboboxInput()?.focus()

          // Open combobox
          await press(Keys.ArrowUp)

          let options = getComboboxOptions()

          // We should be on the last option
          assertActiveComboboxOption(options[2])

          // We should be able to go to the first option
          await press(Keys.Home)
          assertActiveComboboxOption(options[0])
        })
      )

      it(
        'should be possible to use the Home key to go to the first non disabled combobox option',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption disabled value="a"> Option A </ComboboxOption>
                  <ComboboxOption disabled value="b"> Option B </ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                  <ComboboxOption value="d">Option D</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          // Open combobox
          await click(getComboboxButton())

          // We opened via click, we don't have an active option
          assertNoActiveComboboxOption()

          // We should not be able to go to the end
          await press(Keys.Home)

          let options = getComboboxOptions()

          // We should be on the first non-disabled option
          assertActiveComboboxOption(options[2])
        })
      )

      it(
        'should be possible to use the Home key to go to the last combobox option if that is the only non-disabled combobox option',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption disabled value="a"> Option A </ComboboxOption>
                  <ComboboxOption disabled value="b"> Option B </ComboboxOption>
                  <ComboboxOption disabled value="c"> Option C </ComboboxOption>
                  <ComboboxOption value="d">Option D</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          // Open combobox
          await click(getComboboxButton())

          // We opened via click, we don't have an active option
          assertNoActiveComboboxOption()

          // We should not be able to go to the end
          await press(Keys.Home)

          let options = getComboboxOptions()
          assertActiveComboboxOption(options[3])
        })
      )

      it(
        'should have no active combobox option upon Home key press, when there are no non-disabled combobox options',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption disabled value="a"> Option A </ComboboxOption>
                  <ComboboxOption disabled value="b"> Option B </ComboboxOption>
                  <ComboboxOption disabled value="c"> Option C </ComboboxOption>
                  <ComboboxOption disabled value="d"> Option D </ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          // Open combobox
          await click(getComboboxButton())

          // We opened via click, we don't have an active option
          assertNoActiveComboboxOption()

          // We should not be able to go to the end
          await press(Keys.Home)

          assertNoActiveComboboxOption()
        })
      )
    })

    describe('`PageUp` key', () => {
      it(
        'should be possible to use the PageUp key to go to the first combobox option',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption value="a">Option A</ComboboxOption>
                  <ComboboxOption value="b">Option B</ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          // Focus the input
          getComboboxInput()?.focus()

          // Open combobox
          await press(Keys.ArrowUp)

          let options = getComboboxOptions()

          // We should be on the last option
          assertActiveComboboxOption(options[2])

          // We should be able to go to the first option
          await press(Keys.PageUp)
          assertActiveComboboxOption(options[0])
        })
      )

      it(
        'should be possible to use the PageUp key to go to the first non disabled combobox option',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption disabled value="a"> Option A </ComboboxOption>
                  <ComboboxOption disabled value="b"> Option B </ComboboxOption>
                  <ComboboxOption value="c">Option C</ComboboxOption>
                  <ComboboxOption value="d">Option D</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          // Open combobox
          await click(getComboboxButton())

          // We opened via click, we don't have an active option
          assertNoActiveComboboxOption()

          // We should not be able to go to the end
          await press(Keys.PageUp)

          let options = getComboboxOptions()

          // We should be on the first non-disabled option
          assertActiveComboboxOption(options[2])
        })
      )

      it(
        'should be possible to use the PageUp key to go to the last combobox option if that is the only non-disabled combobox option',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption disabled value="a"> Option A </ComboboxOption>
                  <ComboboxOption disabled value="b"> Option B </ComboboxOption>
                  <ComboboxOption disabled value="c"> Option C </ComboboxOption>
                  <ComboboxOption value="d">Option D</ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          // Open combobox
          await click(getComboboxButton())

          // We opened via click, we don't have an active option
          assertNoActiveComboboxOption()

          // We should not be able to go to the end
          await press(Keys.PageUp)

          let options = getComboboxOptions()
          assertActiveComboboxOption(options[3])
        })
      )

      it(
        'should have no active combobox option upon PageUp key press, when there are no non-disabled combobox options',
        suppressConsoleLogs(async () => {
          renderTemplate({
            template: html`
              <Combobox v-model="value">
                <ComboboxInput />
                <ComboboxButton>Trigger</ComboboxButton>
                <ComboboxOptions>
                  <ComboboxOption disabled value="a"> Option A </ComboboxOption>
                  <ComboboxOption disabled value="b"> Option B </ComboboxOption>
                  <ComboboxOption disabled value="c"> Option C </ComboboxOption>
                  <ComboboxOption disabled value="d"> Option D </ComboboxOption>
                </ComboboxOptions>
              </Combobox>
            `,
            setup: () => ({ value: ref(null) }),
          })

          // Open combobox
          await click(getComboboxButton())

          // We opened via click, we don't have an active option
          assertNoActiveComboboxOption()

          // We should not be able to go to the end
          await press(Keys.PageUp)

          assertNoActiveComboboxOption()
        })
      )
    })

    describe('`Any` key aka search', () => {
      let Example = defineComponent({
        components: getDefaultComponents(),

        template: html`
          <Combobox v-model="value">
            <ComboboxInput @change="setQuery" />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions>
              <ComboboxOption
                v-for="person in filteredPeople"
                :key="person.value"
                :value="person.value"
                :disabled="person.disabled"
              >
                {{ person.name }}
              </ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,

        props: {
          people: {
            type: Array as PropType<{ value: string; name: string; disabled: boolean }[]>,
            required: true,
          },
        },

        setup(props) {
          let value = ref<string | null>(null)
          let query = ref('')
          let filteredPeople = computed(() => {
            return query.value === ''
              ? props.people
              : props.people.filter((person) =>
                  person.name.toLowerCase().includes(query.value.toLowerCase())
                )
          })

          return {
            value,
            query,
            filteredPeople,
            setQuery: (event: Event & { target: HTMLInputElement }) => {
              query.value = event.target.value
            },
          }
        },
      })

      it(
        'should be possible to type a full word that has a perfect match',
        suppressConsoleLogs(async () => {
          renderTemplate({
            components: { Example },
            template: html`
              <Example
                :people="[
                  { value: 'alice', name: 'alice', disabled: false },
                  { value: 'bob', name: 'bob', disabled: false },
                  { value: 'charlie', name: 'charlie', disabled: false },
                ]"
              />
            `,
          })

          // Open combobox
          await click(getComboboxButton())

          // Verify we moved focus to the input field
          assertActiveElement(getComboboxInput())
          let options: ReturnType<typeof getComboboxOptions>

          // We should be able to go to the second option
          await type(word('bob'))
          await press(Keys.Home)

          options = getComboboxOptions()
          expect(options).toHaveLength(1)
          expect(options[0]).toHaveTextContent('bob')
          assertActiveComboboxOption(options[0])

          // We should be able to go to the first option
          await type(word('alice'))
          await press(Keys.Home)

          options = getComboboxOptions()
          expect(options).toHaveLength(1)
          expect(options[0]).toHaveTextContent('alice')
          assertActiveComboboxOption(options[0])

          // We should be able to go to the last option
          await type(word('charlie'))
          await press(Keys.Home)

          options = getComboboxOptions()
          expect(options).toHaveLength(1)
          expect(options[0]).toHaveTextContent('charlie')
          assertActiveComboboxOption(options[0])
        })
      )

      it(
        'should be possible to type a partial of a word',
        suppressConsoleLogs(async () => {
          renderTemplate({
            components: { Example },
            template: html`
              <Example
                :people="[
                  { value: 'alice', name: 'alice', disabled: false },
                  { value: 'bob', name: 'bob', disabled: false },
                  { value: 'charlie', name: 'charlie', disabled: false },
                ]"
              />
            `,
          })

          // Open combobox
          await click(getComboboxButton())

          let options: ReturnType<typeof getComboboxOptions>

          // We should be able to go to the second option
          await type(word('bo'))
          await press(Keys.Home)
          options = getComboboxOptions()
          expect(options).toHaveLength(1)
          expect(options[0]).toHaveTextContent('bob')
          assertActiveComboboxOption(options[0])

          // We should be able to go to the first option
          await type(word('ali'))
          await press(Keys.Home)
          options = getComboboxOptions()
          expect(options).toHaveLength(1)
          expect(options[0]).toHaveTextContent('alice')
          assertActiveComboboxOption(options[0])

          // We should be able to go to the last option
          await type(word('char'))
          await press(Keys.Home)
          options = getComboboxOptions()
          expect(options).toHaveLength(1)
          expect(options[0]).toHaveTextContent('charlie')
          assertActiveComboboxOption(options[0])
        })
      )

      it(
        'should be possible to type words with spaces',
        suppressConsoleLogs(async () => {
          renderTemplate({
            components: { Example },
            template: html`
              <Example
                :people="[
                  { value: 'alice', name: 'alice jones', disabled: false },
                  { value: 'bob', name: 'bob the builder', disabled: false },
                  { value: 'charlie', name: 'charlie bit me', disabled: false },
                ]"
              />
            `,
          })

          // Open combobox
          await click(getComboboxButton())

          let options: ReturnType<typeof getComboboxOptions>

          // We should be able to go to the second option
          await type(word('bob t'))
          await press(Keys.Home)
          options = getComboboxOptions()
          expect(options).toHaveLength(1)
          expect(options[0]).toHaveTextContent('bob the builder')
          assertActiveComboboxOption(options[0])

          // We should be able to go to the first option
          await type(word('alice j'))
          await press(Keys.Home)
          options = getComboboxOptions()
          expect(options).toHaveLength(1)
          expect(options[0]).toHaveTextContent('alice jones')
          assertActiveComboboxOption(options[0])

          // We should be able to go to the last option
          await type(word('charlie b'))
          await press(Keys.Home)
          options = getComboboxOptions()
          expect(options).toHaveLength(1)
          expect(options[0]).toHaveTextContent('charlie bit me')
          assertActiveComboboxOption(options[0])
        })
      )

      it(
        'should not be possible to search and activate a disabled option',
        suppressConsoleLogs(async () => {
          renderTemplate({
            components: { Example },
            template: html`
              <Example
                :people="[
                  { value: 'alice', name: 'alice', disabled: false },
                  { value: 'bob', name: 'bob', disabled: true },
                  { value: 'charlie', name: 'charlie', disabled: false },
                ]"
              />
            `,
          })

          // Open combobox
          await click(getComboboxButton())

          // We should not be able to go to the disabled option
          await type(word('bo'))
          await press(Keys.Home)

          assertNoActiveComboboxOption()
          assertNoSelectedComboboxOption()
        })
      )

      it(
        'should maintain activeIndex and activeOption when filtering',
        suppressConsoleLogs(async () => {
          renderTemplate({
            components: { Example },
            template: html`
              <Example
                :people="[
                  { value: 'a', name: 'person a', disabled: false },
                  { value: 'b', name: 'person b', disabled: false },
                  { value: 'c', name: 'person c', disabled: false },
                ]"
              />
            `,
          })

          // Open combobox
          await click(getComboboxButton())

          let options: ReturnType<typeof getComboboxOptions>

          await press(Keys.ArrowDown)
          await press(Keys.ArrowDown)

          // Person B should be active
          options = getComboboxOptions()
          expect(options[1]).toHaveTextContent('person b')
          assertActiveComboboxOption(options[1])

          // Filter more, remove `person a`
          await type(word('person b'))
          options = getComboboxOptions()
          expect(options[0]).toHaveTextContent('person b')
          assertActiveComboboxOption(options[0])

          // Filter less, insert `person a` before `person b`
          await type(word('person'))
          options = getComboboxOptions()
          expect(options[1]).toHaveTextContent('person b')
          assertActiveComboboxOption(options[1])
        })
      )
    })
  })
})

describe('Mouse interactions', () => {
  it(
    'should focus the ComboboxButton when we click the ComboboxLabel',
    suppressConsoleLogs(async () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxLabel>Label</ComboboxLabel>
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions>
              <ComboboxOption value="a">Option A</ComboboxOption>
              <ComboboxOption value="b">Option B</ComboboxOption>
              <ComboboxOption value="c">Option C</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup: () => ({ value: ref(null) }),
      })

      // Ensure the button is not focused yet
      assertActiveElement(document.body)

      // Focus the label
      await click(getComboboxLabel())

      // Ensure that the actual button is focused instead
      assertActiveElement(getComboboxInput())
    })
  )

  it(
    'should not focus the ComboboxInput when we right click the ComboboxLabel',
    suppressConsoleLogs(async () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxLabel>Label</ComboboxLabel>
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions>
              <ComboboxOption value="a">Option A</ComboboxOption>
              <ComboboxOption value="b">Option B</ComboboxOption>
              <ComboboxOption value="c">Option C</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup: () => ({ value: ref(null) }),
      })

      // Ensure the button is not focused yet
      assertActiveElement(document.body)

      // Focus the label
      await click(getComboboxLabel(), MouseButton.Right)

      // Ensure that the body is still active
      assertActiveElement(document.body)
    })
  )

  it(
    'should be possible to open the combobox on click',
    suppressConsoleLogs(async () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions>
              <ComboboxOption value="a">Option A</ComboboxOption>
              <ComboboxOption value="b">Option B</ComboboxOption>
              <ComboboxOption value="c">Option C</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup: () => ({ value: ref(null) }),
      })

      assertComboboxButton({
        state: ComboboxState.InvisibleUnmounted,
        attributes: { id: 'headlessui-combobox-button-2' },
      })
      assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

      // Open combobox
      await click(getComboboxButton())

      // Verify it is visible
      assertComboboxButton({ state: ComboboxState.Visible })
      assertComboboxList({
        state: ComboboxState.Visible,
        attributes: { id: 'headlessui-combobox-options-3' },
      })
      assertActiveElement(getComboboxInput())
      assertComboboxButtonLinkedWithCombobox()

      // Verify we have combobox options
      let options = getComboboxOptions()
      expect(options).toHaveLength(3)
      options.forEach((option) => assertComboboxOption(option))
    })
  )

  it(
    'should not be possible to open the combobox on right click',
    suppressConsoleLogs(async () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions>
              <ComboboxOption value="a">Option A</ComboboxOption>
              <ComboboxOption value="b">Option B</ComboboxOption>
              <ComboboxOption value="c">Option C</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup: () => ({ value: ref(null) }),
      })

      assertComboboxButton({
        state: ComboboxState.InvisibleUnmounted,
        attributes: { id: 'headlessui-combobox-button-2' },
      })
      assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

      // Try to open the combobox
      await click(getComboboxButton(), MouseButton.Right)

      // Verify it is still closed
      assertComboboxButton({ state: ComboboxState.InvisibleUnmounted })
    })
  )

  it(
    'should not be possible to open the combobox on click when the button is disabled',
    suppressConsoleLogs(async () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value" disabled>
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions>
              <ComboboxOption value="a">Option A</ComboboxOption>
              <ComboboxOption value="b">Option B</ComboboxOption>
              <ComboboxOption value="c">Option C</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup: () => ({ value: ref(null) }),
      })

      assertComboboxButton({
        state: ComboboxState.InvisibleUnmounted,
        attributes: { id: 'headlessui-combobox-button-2' },
      })
      assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

      // Try to open the combobox
      await click(getComboboxButton())

      // Verify it is still closed
      assertComboboxButton({
        state: ComboboxState.InvisibleUnmounted,
        attributes: { id: 'headlessui-combobox-button-2' },
      })
      assertComboboxList({ state: ComboboxState.InvisibleUnmounted })
    })
  )

  it(
    'should be possible to open the combobox on click, and focus the selected option',
    suppressConsoleLogs(async () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions>
              <ComboboxOption value="a">Option A</ComboboxOption>
              <ComboboxOption value="b">Option B</ComboboxOption>
              <ComboboxOption value="c">Option C</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup: () => ({ value: ref('b') }),
      })

      assertComboboxButton({
        state: ComboboxState.InvisibleUnmounted,
        attributes: { id: 'headlessui-combobox-button-2' },
      })
      assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

      // Open combobox
      await click(getComboboxButton())

      // Verify it is visible
      assertComboboxButton({ state: ComboboxState.Visible })
      assertComboboxList({
        state: ComboboxState.Visible,
        attributes: { id: 'headlessui-combobox-options-3' },
      })
      assertActiveElement(getComboboxInput())
      assertComboboxButtonLinkedWithCombobox()

      // Verify we have combobox options
      let options = getComboboxOptions()
      expect(options).toHaveLength(3)
      options.forEach((option, i) => assertComboboxOption(option, { selected: i === 1 }))

      // Verify that the second combobox option is active (because it is already selected)
      assertActiveComboboxOption(options[1])
    })
  )

  it(
    'should be possible to close a combobox on click',
    suppressConsoleLogs(async () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions>
              <ComboboxOption value="a">Option A</ComboboxOption>
              <ComboboxOption value="b">Option B</ComboboxOption>
              <ComboboxOption value="c">Option C</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup: () => ({ value: ref(null) }),
      })

      // Open combobox
      await click(getComboboxButton())

      // Verify it is visible
      assertComboboxButton({ state: ComboboxState.Visible })

      // Click to close
      await click(getComboboxButton())

      // Verify it is closed
      assertComboboxButton({ state: ComboboxState.InvisibleUnmounted })
      assertComboboxList({ state: ComboboxState.InvisibleUnmounted })
    })
  )

  it(
    'should be a no-op when we click outside of a closed combobox',
    suppressConsoleLogs(async () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions>
              <ComboboxOption value="alice">alice</ComboboxOption>
              <ComboboxOption value="bob">bob</ComboboxOption>
              <ComboboxOption value="charlie">charlie</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup: () => ({ value: ref(null) }),
      })

      // Verify that the window is closed
      assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

      // Click something that is not related to the combobox
      await click(document.body)

      // Should still be closed
      assertComboboxList({ state: ComboboxState.InvisibleUnmounted })
    })
  )

  // TODO: JSDOM doesn't quite work here
  // Clicking outside on the body should fire a mousedown (which it does) and then change the active element (which it doesn't)
  xit(
    'should be possible to click outside of the combobox which should close the combobox',
    suppressConsoleLogs(async () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions>
              <ComboboxOption value="alice">alice</ComboboxOption>
              <ComboboxOption value="bob">bob</ComboboxOption>
              <ComboboxOption value="charlie">charlie</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
          <div tabindex="-1">after</div>
        `,
        setup: () => ({ value: ref(null) }),
      })

      // Open combobox
      await click(getComboboxButton())
      assertComboboxList({ state: ComboboxState.Visible })
      assertActiveElement(getComboboxInput())

      // Click something that is not related to the combobox
      await click(getByText('after'))

      // Should be closed now
      assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

      // Verify the input is focused again
      assertActiveElement(getByText('after'))
    })
  )

  it(
    'should be possible to click outside of the combobox on another combobox button which should close the current combobox and open the new combobox',
    suppressConsoleLogs(async () => {
      renderTemplate({
        template: html`
          <div>
            <Combobox v-model="value">
              <ComboboxInput />
              <ComboboxButton>Trigger</ComboboxButton>
              <ComboboxOptions>
                <ComboboxOption value="alice">alice</ComboboxOption>
                <ComboboxOption value="bob">bob</ComboboxOption>
                <ComboboxOption value="charlie">charlie</ComboboxOption>
              </ComboboxOptions>
            </Combobox>

            <Combobox v-model="value">
              <ComboboxInput />
              <ComboboxButton>Trigger</ComboboxButton>
              <ComboboxOptions>
                <ComboboxOption value="alice">alice</ComboboxOption>
                <ComboboxOption value="bob">bob</ComboboxOption>
                <ComboboxOption value="charlie">charlie</ComboboxOption>
              </ComboboxOptions>
            </Combobox>
          </div>
        `,
        setup: () => ({ value: ref(null) }),
      })

      let [button1, button2] = getComboboxButtons()

      // Click the first combobox button
      await click(button1)
      expect(getComboboxes()).toHaveLength(1) // Only 1 combobox should be visible

      // Verify that the first input is focused
      assertActiveElement(getComboboxInputs()[0])

      // Click the second combobox button
      await click(button2)

      expect(getComboboxes()).toHaveLength(1) // Only 1 combobox should be visible

      // Verify that the first input is focused
      assertActiveElement(getComboboxInputs()[1])
    })
  )

  it(
    'should be possible to click outside of the combobox which should close the combobox (even if we press the combobox button)',
    suppressConsoleLogs(async () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions>
              <ComboboxOption value="alice">alice</ComboboxOption>
              <ComboboxOption value="bob">bob</ComboboxOption>
              <ComboboxOption value="charlie">charlie</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup: () => ({ value: ref(null) }),
      })

      // Open combobox
      await click(getComboboxButton())
      assertComboboxList({ state: ComboboxState.Visible })
      assertActiveElement(getComboboxInput())

      // Click the combobox button again
      await click(getComboboxButton())

      // Should be closed now
      assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

      // Verify the input is focused again
      assertActiveElement(getComboboxInput())
    })
  )

  it(
    'should be possible to click outside of the combobox, on an element which is within a focusable element, which closes the combobox',
    suppressConsoleLogs(async () => {
      let focusFn = jest.fn()
      renderTemplate({
        template: html`
          <div>
            <Combobox v-model="value">
              <ComboboxInput @focus="focusFn" />
              <ComboboxButton>Trigger</ComboboxButton>
              <ComboboxOptions>
                <ComboboxOption value="alice">alice</ComboboxOption>
                <ComboboxOption value="bob">bob</ComboboxOption>
                <ComboboxOption value="charlie">charlie</ComboboxOption>
              </ComboboxOptions>
            </Combobox>

            <button id="btn">
              <span>Next</span>
            </button>
          </div>
        `,
        setup: () => ({ value: ref('test'), focusFn }),
      })

      // Click the combobox button
      await click(getComboboxButton())

      // Ensure the combobox is open
      assertComboboxList({ state: ComboboxState.Visible })

      // Click the span inside the button
      await click(getByText('Next'))

      // Ensure the combobox is closed
      assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

      // Ensure the outside button is focused
      assertActiveElement(document.getElementById('btn'))

      // Ensure that the focus button only got focus once (first click)
      expect(focusFn).toHaveBeenCalledTimes(1)
    })
  )

  it(
    'should be possible to hover an option and make it active',
    suppressConsoleLogs(async () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions>
              <ComboboxOption value="alice">alice</ComboboxOption>
              <ComboboxOption value="bob">bob</ComboboxOption>
              <ComboboxOption value="charlie">charlie</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup: () => ({ value: ref(null) }),
      })

      // Open combobox
      await click(getComboboxButton())

      let options = getComboboxOptions()
      // We should be able to go to the second option
      await mouseMove(options[1])
      assertActiveComboboxOption(options[1])

      // We should be able to go to the first option
      await mouseMove(options[0])
      assertActiveComboboxOption(options[0])

      // We should be able to go to the last option
      await mouseMove(options[2])
      assertActiveComboboxOption(options[2])
    })
  )

  it(
    'should be possible to hover an option and make it active when using `static`',
    suppressConsoleLogs(async () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions static>
              <ComboboxOption value="alice">alice</ComboboxOption>
              <ComboboxOption value="bob">bob</ComboboxOption>
              <ComboboxOption value="charlie">charlie</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup: () => ({ value: ref(null) }),
      })

      let options = getComboboxOptions()
      // We should be able to go to the second option
      await mouseMove(options[1])
      assertActiveComboboxOption(options[1])

      // We should be able to go to the first option
      await mouseMove(options[0])
      assertActiveComboboxOption(options[0])

      // We should be able to go to the last option
      await mouseMove(options[2])
      assertActiveComboboxOption(options[2])
    })
  )

  it(
    'should make a combobox option active when you move the mouse over it',
    suppressConsoleLogs(async () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions>
              <ComboboxOption value="alice">alice</ComboboxOption>
              <ComboboxOption value="bob">bob</ComboboxOption>
              <ComboboxOption value="charlie">charlie</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup: () => ({ value: ref(null) }),
      })

      // Open combobox
      await click(getComboboxButton())

      let options = getComboboxOptions()
      // We should be able to go to the second option
      await mouseMove(options[1])
      assertActiveComboboxOption(options[1])
    })
  )

  it(
    'should be a no-op when we move the mouse and the combobox option is already active',
    suppressConsoleLogs(async () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions>
              <ComboboxOption value="alice">alice</ComboboxOption>
              <ComboboxOption value="bob">bob</ComboboxOption>
              <ComboboxOption value="charlie">charlie</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup: () => ({ value: ref(null) }),
      })

      // Open combobox
      await click(getComboboxButton())

      let options = getComboboxOptions()

      // We should be able to go to the second option
      await mouseMove(options[1])
      assertActiveComboboxOption(options[1])

      await mouseMove(options[1])

      // Nothing should be changed
      assertActiveComboboxOption(options[1])
    })
  )

  it(
    'should be a no-op when we move the mouse and the combobox option is disabled',
    suppressConsoleLogs(async () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions>
              <ComboboxOption value="alice">alice</ComboboxOption>
              <ComboboxOption disabled value="bob"> bob </ComboboxOption>
              <ComboboxOption value="charlie">charlie</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup: () => ({ value: ref(null) }),
      })

      // Open combobox
      await click(getComboboxButton())

      let options = getComboboxOptions()

      await mouseMove(options[1])
      assertNoActiveComboboxOption()
    })
  )

  it(
    'should not be possible to hover an option that is disabled',
    suppressConsoleLogs(async () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions>
              <ComboboxOption value="alice">alice</ComboboxOption>
              <ComboboxOption disabled value="bob"> bob </ComboboxOption>
              <ComboboxOption value="charlie">charlie</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup: () => ({ value: ref(null) }),
      })

      // Open combobox
      await click(getComboboxButton())

      let options = getComboboxOptions()

      // Try to hover over option 1, which is disabled
      await mouseMove(options[1])

      // We should not have an active option now
      assertNoActiveComboboxOption()
    })
  )

  it(
    'should be possible to mouse leave an option and make it inactive',
    suppressConsoleLogs(async () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions>
              <ComboboxOption value="alice">alice</ComboboxOption>
              <ComboboxOption value="bob">bob</ComboboxOption>
              <ComboboxOption value="charlie">charlie</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup: () => ({ value: ref(null) }),
      })

      // Open combobox
      await click(getComboboxButton())

      let options = getComboboxOptions()

      // We should be able to go to the second option
      await mouseMove(options[1])
      assertActiveComboboxOption(options[1])

      await mouseLeave(options[1])
      assertNoActiveComboboxOption()

      // We should be able to go to the first option
      await mouseMove(options[0])
      assertActiveComboboxOption(options[0])

      await mouseLeave(options[0])
      assertNoActiveComboboxOption()

      // We should be able to go to the last option
      await mouseMove(options[2])
      assertActiveComboboxOption(options[2])

      await mouseLeave(options[2])
      assertNoActiveComboboxOption()
    })
  )

  it(
    'should be possible to mouse leave a disabled option and be a no-op',
    suppressConsoleLogs(async () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions>
              <ComboboxOption value="alice">alice</ComboboxOption>
              <ComboboxOption disabled value="bob"> bob </ComboboxOption>
              <ComboboxOption value="charlie">charlie</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup: () => ({ value: ref(null) }),
      })

      // Open combobox
      await click(getComboboxButton())

      let options = getComboboxOptions()

      // Try to hover over option 1, which is disabled
      await mouseMove(options[1])
      assertNoActiveComboboxOption()

      await mouseLeave(options[1])
      assertNoActiveComboboxOption()
    })
  )

  it(
    'should be possible to click a combobox option, which closes the combobox',
    suppressConsoleLogs(async () => {
      let handleChange = jest.fn()
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions>
              <ComboboxOption value="alice">alice</ComboboxOption>
              <ComboboxOption value="bob">bob</ComboboxOption>
              <ComboboxOption value="charlie">charlie</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup() {
          let value = ref(null)
          watch([value], () => handleChange(value.value))
          return { value }
        },
      })

      // Open combobox
      await click(getComboboxButton())
      assertComboboxList({ state: ComboboxState.Visible })
      assertActiveElement(getComboboxInput())

      let options = getComboboxOptions()

      // We should be able to click the first option
      await click(options[1])
      assertComboboxList({ state: ComboboxState.InvisibleUnmounted })
      expect(handleChange).toHaveBeenCalledTimes(1)
      expect(handleChange).toHaveBeenCalledWith('bob')

      // Verify the input is focused again
      assertActiveElement(getComboboxInput())

      // Open combobox again
      await click(getComboboxButton())

      // Verify the active option is the previously selected one
      assertActiveComboboxOption(getComboboxOptions()[1])
    })
  )

  it(
    'should be possible to click a disabled combobox option, which is a no-op',
    suppressConsoleLogs(async () => {
      let handleChange = jest.fn()
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions>
              <ComboboxOption value="alice">alice</ComboboxOption>
              <ComboboxOption disabled value="bob"> bob </ComboboxOption>
              <ComboboxOption value="charlie">charlie</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup() {
          let value = ref(null)
          watch([value], () => handleChange(value.value))
          return { value }
        },
      })

      // Open combobox
      await click(getComboboxButton())
      assertComboboxList({ state: ComboboxState.Visible })
      assertActiveElement(getComboboxInput())

      let options = getComboboxOptions()

      // We should be able to click the first option
      await click(options[1])
      assertComboboxList({ state: ComboboxState.Visible })
      assertActiveElement(getComboboxInput())
      expect(handleChange).toHaveBeenCalledTimes(0)

      // Close the combobox
      await click(getComboboxButton())

      // Open combobox again
      await click(getComboboxButton())

      // Verify the active option is non existing
      assertNoActiveComboboxOption()
    })
  )

  it(
    'should be possible focus a combobox option, so that it becomes active',
    suppressConsoleLogs(async () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions>
              <ComboboxOption value="alice">alice</ComboboxOption>
              <ComboboxOption value="bob">bob</ComboboxOption>
              <ComboboxOption value="charlie">charlie</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup: () => ({ value: ref(null) }),
      })

      // Open combobox
      await click(getComboboxButton())
      assertComboboxList({ state: ComboboxState.Visible })
      assertActiveElement(getComboboxInput())

      let options = getComboboxOptions()

      // Verify that nothing is active yet
      assertNoActiveComboboxOption()

      // We should be able to focus the first option
      await focus(options[1])
      assertActiveComboboxOption(options[1])
    })
  )

  it(
    'should not be possible to focus a combobox option which is disabled',
    suppressConsoleLogs(async () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value">
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions>
              <ComboboxOption value="alice">alice</ComboboxOption>
              <ComboboxOption disabled value="bob"> bob </ComboboxOption>
              <ComboboxOption value="charlie">charlie</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup: () => ({ value: ref(null) }),
      })

      // Open combobox
      await click(getComboboxButton())
      assertComboboxList({ state: ComboboxState.Visible })
      assertActiveElement(getComboboxInput())

      let options = getComboboxOptions()

      // We should not be able to focus the first option
      await focus(options[1])
      assertNoActiveComboboxOption()
    })
  )

  it(
    'should be possible to hold the last active option',
    suppressConsoleLogs(async () => {
      renderTemplate({
        template: html`
          <Combobox v-model="value" hold>
            <ComboboxInput />
            <ComboboxButton>Trigger</ComboboxButton>
            <ComboboxOptions>
              <ComboboxOption value="a">Option A</ComboboxOption>
              <ComboboxOption value="b">Option B</ComboboxOption>
              <ComboboxOption value="c">Option C</ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        `,
        setup: () => ({ value: ref(null) }),
      })

      assertComboboxButton({
        state: ComboboxState.InvisibleUnmounted,
        attributes: { id: 'headlessui-combobox-button-2' },
      })
      assertComboboxList({ state: ComboboxState.InvisibleUnmounted })

      await click(getComboboxButton())

      assertComboboxButton({
        state: ComboboxState.Visible,
        attributes: { id: 'headlessui-combobox-button-2' },
      })
      assertComboboxList({ state: ComboboxState.Visible })

      let options = getComboboxOptions()

      // Hover the first item
      await mouseMove(options[0])

      // Verify that the first combobox option is active
      assertActiveComboboxOption(options[0])

      // Focus the second item
      await mouseMove(options[1])

      // Verify that the second combobox option is active
      assertActiveComboboxOption(options[1])

      // Move the mouse off of the second combobox option
      await mouseLeave(options[1])
      await mouseMove(document.body)

      // Verify that the second combobox option is still active
      assertActiveComboboxOption(options[1])
    })
  )
})

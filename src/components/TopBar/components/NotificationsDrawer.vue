<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'

import { useBewlyApp } from '~/composables/useAppProvider'
import { useDrawerIframeLifecycle } from '~/composables/useDrawerIframeLifecycle'
import { settings } from '~/logic'

// TODO: support shortcuts like `Ctrl+Alt+T` to open in new tab, `Esc` to close

const props = defineProps<{
  url: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { mainAppRef } = useBewlyApp()

const show = ref(false)
const iframeRef = ref<HTMLIFrameElement | null>(null)
const currentUrl = ref<string>(props.url || 'https://message.bilibili.com/')
// iframe 何时挂载由 useDrawerIframeLifecycle 管理(关闭即卸载,下次打开重新加载新文档)。
// 抽屉本身被 TopBar 的 <KeepAlive> 缓存,组件不会卸载;若 iframe 用 v-show 常驻,
// message.bilibili.com 的文档就会一直活到标签页结束,开久后其内部会话/连接失效,
// 再打开就是「加载失败」—— 详见该 composable 的注释与单测。
const { iframeMounted: showIframe, open: openIframe, close: closeIframe } = useDrawerIframeLifecycle()
const delayCloseTimer = ref<NodeJS.Timeout | null>(null)

onMounted(() => {
  handleOpen()
})

onActivated(() => {
  handleOpen()
})

const beforeUrl = ref<string>('')
function handleOpen() {
  show.value = true
  if (beforeUrl.value !== props.url) {
    currentUrl.value = props.url
    beforeUrl.value = props.url
  }
  // 重新挂载 iframe(关闭时已卸载),从而拿到全新文档
  openIframe()
  nextTick(() => {
    iframeRef.value?.focus()
  })
}

onBeforeUnmount(() => {
  releaseIframeResources()
})

async function handleClose() {
  if (delayCloseTimer.value) {
    clearTimeout(delayCloseTimer.value)
  }
  // 卸载消息页文档,避免陈旧会话被长期复用
  closeIframe()
  show.value = false
  delayCloseTimer.value = setTimeout(() => {
    emit('close')
  }, 300)
}

async function releaseIframeResources() {
  // 只做样式表卸载善后(组件 onBeforeUnmount 时兜底),不要改 currentUrl ——
  // 下一次打开要重新加载消息页,改掉它会让 iframe 打开即 about:blank。
  if (iframeRef.value) {
    try {
      iframeRef.value.src = 'about:blank'
    }
    catch {
      // 文档已卸载时忽略
    }
  }
  await nextTick()
  try {
    iframeRef.value?.contentWindow?.close()
  }
  catch {
    // 跨域或文档已卸载时忽略
  }

  // Remove iframe from the DOM
  iframeRef.value?.parentNode?.removeChild(iframeRef.value)
  await nextTick()

  // Nullify the reference
  iframeRef.value = null
}

function handleOpenInNewTab() {
  if (iframeRef.value) {
    try {
      window.open(iframeRef.value.contentWindow?.location.href.replace(/\/$/, ''), '_blank')
    }
    catch {
      window.open('https://message.bilibili.com/', '_blank')
    }
    handleClose()
  }
}

const isEscPressed = ref<boolean>(false)
const escPressedTimer = ref<NodeJS.Timeout | null>(null)
const disableEscPress = ref<boolean>(false)

/**
 * Not working, idk why
 */
nextTick(() => {
  onKeyStroke('Escape', (e: KeyboardEvent) => {
    e.preventDefault()
    if (settings.value.closeDrawerWithoutPressingEscAgain) {
      clearTimeout(escPressedTimer.value!)
      handleClose()
      return
    }
    if (disableEscPress.value)
      return
    if (isEscPressed.value) {
      handleClose()
    }
    else {
      isEscPressed.value = true
      if (escPressedTimer.value) {
        clearTimeout(escPressedTimer.value)
      }
      escPressedTimer.value = setTimeout(() => {
        isEscPressed.value = false
      }, 1300)
    }
  }, { target: iframeRef.value?.contentWindow })
})

// const keys = useMagicKeys()
// const ctrlAltT = keys['Ctrl+Alt+T']

// watch(() => ctrlAltT, (value) => {
//   if (value) {
//     handleOpenInNewTab()
//   }
// })
</script>

<template>
  <Teleport :to="mainAppRef">
    <div
      :style="{ pointerEvents: show ? 'auto' : 'none' }"
      pos="fixed top-0 left-0" of-hidden w-full h-full
      z-999999
    >
      <!-- Mask -->
      <Transition name="fade">
        <div
          v-if="show"
          pos="absolute bottom-0 left-0" w-full h-full bg="black opacity-60"
          @click="handleClose"
        />
      </Transition>

      <Transition name="drawer">
        <div
          v-show="show"
          pos="absolute top-0 right-0" of-hidden bg="$bew-bg"
          w="xl:70vw lg:80vw md:100vw 100vw" max-w-1400px h-full
        >
          <div
            pos="fixed top-0 right-0" z-10 flex="~ items-center justify-between gap-2"
            w-inherit max-w-inherit h="$bew-top-bar-height"
            m-auto px-4
            pointer-events-none
          >
            <h3 text="xl" fw-bold>
              {{ $t('topbar.notifications') }}
            </h3>
            <div flex="~ items-center gap-2">
              <Button
                style="
                  --b-button-color: var(--bew-elevated-solid);
                  --b-button-color-hover: var(--bew-elevated-solid-hover);
                "
                pointer-events-auto
                shadow="!$bew-shadow-1"
                @click="handleOpenInNewTab"
              >
                <template #left>
                  <i i-mingcute:external-link-line />
                </template>
                {{ $t('iframe_drawer.open_in_new_tab') }}
              <!-- <div flex="~">
            <kbd>Ctrl</kbd><kbd>Alt</kbd><kbd>T</kbd>
          </div> -->
              </Button>
              <Button
                v-if="!isEscPressed"
                style="
                  --b-button-color: var(--bew-elevated-solid);
                  --b-button-color-hover: var(--bew-elevated-solid-hover);
                "
                pointer-events-auto
                shadow="!$bew-shadow-1"
                @click="handleClose"
              >
                <template #left>
                  <i i-mingcute:close-line />
                </template>
                {{ $t('iframe_drawer.close') }}
                <kbd>Esc</kbd>
              </Button>
              <Button
                v-else
                type="error"
                shadow="!$bew-shadow-1"
                @click="handleClose"
              >
                <template #left>
                  <i i-mingcute:close-line />
                </template>
                {{ $t('iframe_drawer.press_esc_again_to_close') }}
                <kbd>Esc</kbd>
              </Button>
            </div>
          </div>

          <Transition name="fade">
            <Loading
              v-if="!showIframe"
              pos="absolute top-0 right-0" of-hidden
              w-full h-full
            />
          </Transition>

          <Transition name="fade">
            <!-- Iframe: 用 v-if 而非 v-show,关闭即卸载文档(见 showIframe 的说明) -->
            <iframe
              v-if="showIframe"
              ref="iframeRef"
              :src="currentUrl"
              frameborder="0"
              pointer-events-auto
              pos="relative right-0"
              w-inherit
              max-w-inherit h-full
            />
          </Transition>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.3s;
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}
</style>

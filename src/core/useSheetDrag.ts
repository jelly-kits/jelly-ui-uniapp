import { onBeforeUnmount, ref } from 'vue'

/**
 * 底部弹出层的下拉关闭手势（uni 版）。
 *
 * 与主库 src/core/useSheetDrag.ts 的差异：主库用 pointer 事件 + `setPointerCapture`，
 * 小程序端两者都没有，所以这里改成「触摸 + 鼠标」两条原生通道，与 je-dialog 的拖拽同构：
 *  - 触摸：touchstart / touchmove / touchend / touchcancel（小程序与移动 H5 走这条）
 *  - 鼠标：mousedown 收在手势元素上，mousemove / mouseup 挂到 document，划出手势元素也能继续拖
 *
 * 两套处理器不写条件编译：模板上同一个手势元素同时绑了两套，而条件编译只支持按整块元素取舍，
 * 砍掉任何一套都会让模板引用到不存在的绑定。小程序端 mousedown 永不触发，H5 端触摸事件同理。
 *
 * 用法：把返回的处理器挂到「拖拽把手」元素上，位移只做视觉反馈，松手超过阈值才触发关闭。
 */
export function useSheetDrag(onDismiss: () => void, threshold = 96) {
  const offset = ref(0)
  const dragging = ref(false)
  let startY = 0

  const reset = () => {
    dragging.value = false
    offset.value = 0
  }

  const begin = (clientY: number) => {
    dragging.value = true
    startY = clientY
  }

  const move = (clientY: number) => {
    if (!dragging.value) return
    // 只允许向下拖，向上拖没有语义
    offset.value = Math.max(0, clientY - startY)
  }

  const finish = () => {
    if (!dragging.value) return
    dragging.value = false
    if (offset.value > threshold) {
      onDismiss()
      return
    }
    // 没到阈值就回弹
    offset.value = 0
  }

  const onTouchStart = (event: TouchEvent) => {
    const touch = event.touches?.[0]
    if (touch) begin(touch.clientY)
  }

  const onTouchMove = (event: TouchEvent) => {
    const touch = event.touches?.[0]
    if (touch) move(touch.clientY)
  }

  /* 鼠标通道：只在 H5 会走到，小程序端 mousedown 不触发 */
  const onDocMouseMove = (event: MouseEvent) => move(event.clientY)

  const onDocMouseUp = () => {
    finish()
    // #ifdef H5
    document.removeEventListener('mousemove', onDocMouseMove)
    document.removeEventListener('mouseup', onDocMouseUp)
    // #endif
  }

  const onMouseDown = (event: MouseEvent) => {
    if (event.button !== 0) return
    begin(event.clientY)
    // #ifdef H5
    document.addEventListener('mousemove', onDocMouseMove)
    document.addEventListener('mouseup', onDocMouseUp)
    // #endif
  }

  onBeforeUnmount(() => {
    // #ifdef H5
    document.removeEventListener('mousemove', onDocMouseMove)
    document.removeEventListener('mouseup', onDocMouseUp)
    // #endif
  })

  return {
    offset,
    dragging,
    reset,
    onTouchStart,
    onTouchMove,
    onTouchEnd: finish,
    onTouchCancel: finish,
    onMouseDown,
  }
}

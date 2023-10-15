import React, { useMemo } from 'react'
import { preventDefault, releasePointerCapture, setPointerCapture } from '../utils/dom'
import { getPointerInfo } from '../utils/getPointerInfo'
import { useEditor } from './useEditor'
import { throttle } from '@tldraw/utils'

export function useCanvasEvents() {
	const editor = useEditor()

	const events = useMemo(
		function canvasEvents() {
			// Track the last screen point
			let lastX: number, lastY: number
			let droppingNext = 0

			function onPointerDown(e: React.PointerEvent) {
				if ((e as any).nativeEvent.__shouldIgnoreByCanvas) return
				if ((e as any).isKilled) return
				if (e.button !== 0 && e.button !== 1 && e.button !== 5) return

				setPointerCapture(e.currentTarget, e)

				// console.timeStamp("pointer down")
				// console.log("pointer down", Date.now());
				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					name: 'pointer_down',
					...getPointerInfo(e),
				})				
			}

			function onPointerMove(e: React.PointerEvent) {
				if ((e as any).nativeEvent.__shouldIgnoreByCanvas) return
				if ((e as any).isKilled) return

				if (e.clientX === lastX && e.clientY === lastY) return
				lastX = e.clientX
				lastY = e.clientY

				if (e.pointerType === "pen" && droppingNext > 0) {
					droppingNext -= 1
					console.timeStamp("pen draw")
					console.log("pen draw", Date.now());
					editor.dispatch({
						type: 'pointer',
						target: 'canvas',
						name: 'pointer_draw',
						...getPointerInfo(e),
					})
					return;
				} else {
					if (e.pointerType === "pen") {
						if (window.__largePage) droppingNext = 3
					}
					console.timeStamp("pen move")
					// console.log("pen move", Date.now());
					editor.dispatch({
						type: 'pointer',
						target: 'canvas',
						name: 'pointer_move',
						...getPointerInfo(e),
					})
				}
			}

			function onPointerUp(e: React.PointerEvent) {
				if ((e as any).nativeEvent.__shouldIgnoreByCanvas) return
				if ((e as any).isKilled) return
				if (e.button !== 0 && e.button !== 1 && e.button !== 2 && e.button !== 5) return
				lastX = e.clientX
				lastY = e.clientY

				releasePointerCapture(e.currentTarget, e)

				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					name: 'pointer_up',
					...getPointerInfo(e),
				})
			}

			function onTouchStart(e: React.TouchEvent) {
				;(e as any).isKilled = true
				// todo: investigate whether this effects keyboard shortcuts
				// god damn it, but necessary for long presses to open the context menu
				document.body.click()
				preventDefault(e)
			}

			function onTouchEnd(e: React.TouchEvent) {
				;(e as any).isKilled = true
				if (
					(e.target as HTMLElement).tagName !== 'A' &&
					(e.target as HTMLElement).tagName !== 'TEXTAREA'
				) {
					preventDefault(e)
				}
			}

			function onDragOver(e: React.DragEvent<Element>) {
				preventDefault(e)
			}

			async function onDrop(e: React.DragEvent<Element>) {
				preventDefault(e)
				if (!e.dataTransfer?.files?.length) return

				const files = Array.from(e.dataTransfer.files)
				
				await editor.putExternalContent({
					type: 'files', 
					files,
					point: editor.screenToPage({ x: e.clientX, y: e.clientY }),
					ignoreParent: false,
				})
			}

			return {
				onPointerDown,
				onPointerMove,
				onPointerUp,
				onDragOver,
				onDrop,
				onTouchStart,
				onTouchEnd,
			}
		},
		[editor]
	)

	return events
}

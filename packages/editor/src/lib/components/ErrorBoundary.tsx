import * as React from 'react'
import { TLErrorFallbackComponent } from './default-components/DefaultErrorFallback'

/** @public */
export interface TLErrorBoundaryProps {
	children: React.ReactNode
	onError?: ((error: unknown) => void) | null
	fallback: TLErrorFallbackComponent
}

type TLErrorBoundaryState = { error: Error | null }

const initialState: TLErrorBoundaryState = { error: null }

/** @public */
export class ErrorBoundary extends React.Component<
	React.PropsWithRef<React.PropsWithChildren<TLErrorBoundaryProps>>,
	TLErrorBoundaryState
> {
	static getDerivedStateFromError(error: Error) {
		return { error }
	}

	override state = initialState

	override componentDidCatch(error: unknown, errorInfo: any) {
		error.componentStack = errorInfo.componentStack
		this.props.onError?.(error)
	}

	override render() {
		const { error } = this.state

		if (error !== null) {
			const { fallback: Fallback } = this.props
			return <Fallback error={error} retry={() => {
				console.log('retry')
				this.setState(initialState);
			}} />
		}

		return this.props.children
	}
}

/** @internal */
export function OptionalErrorBoundary({
	children,
	fallback,
	...props
}: Omit<TLErrorBoundaryProps, 'fallback'> & {
	fallback: TLErrorFallbackComponent
}) {
	if (fallback === null) {
		return <>{children}</>
	}

	return (
		<ErrorBoundary fallback={fallback as any} {...props}>
			{children}
		</ErrorBoundary>
	)
}

import { EASINGS } from '@tldraw/editor'
import { StrokeOptions, StrokePoint } from './types'

const { min } = Math

// This is the rate of change for simulated pressure. It could be an option.
const RATE_OF_PRESSURE_CHANGE = 0.275

/**
 * Simulates the width of a calligraphy pen stroke based on the segment direction.
 *
 * @param {number} fromX - The starting x-coordinate.
 * @param {number} fromY - The starting y-coordinate.
 * @param {number} toX - The ending x-coordinate.
 * @param {number} toY - The ending y-coordinate.
 * @param {number} maxStrokeWidth - The maximum stroke width. 
 * @returns {number} - The desired stroke width.
 */
function calligraphyPenWidth(fromX, fromY, toX, toY, maxStrokeWidth = 1.5, minStrokeWidth = 0.5) {
    // Calculate the change in x and y direction.
    let dx = toX - fromX;
    let dy = toY - fromY;

    // Calculate the angle of the stroke segment with respect to the x-axis.
    let angle = Math.atan2(dy, dx);

    // Calculate the stroke width based on the angle. 
    // This assumes a 45-degree angle gives maximum width.
    let desiredWidth = minStrokeWidth + (maxStrokeWidth-minStrokeWidth) * Math.abs(Math.sin(angle));

    return desiredWidth;
}


/** @public */
export function setStrokePointRadii(strokePoints: StrokePoint[], options: StrokeOptions) {
	const {
		size = 16,
		thinning = 0.5,
		simulatePressure = true,
		easing = (t) => t,
		start = {},
		end = {},
	} = options

	const { easing: taperStartEase = EASINGS.easeOutQuad } = start
	const { easing: taperEndEase = EASINGS.easeOutCubic } = end

	const totalLength = strokePoints[strokePoints.length - 1].runningLength

	let firstRadius: number | undefined
	let prevPressure = strokePoints[0].pressure
	let strokePoint: StrokePoint

	if (!simulatePressure && totalLength < size) {
		const max = strokePoints.reduce((max, curr) => Math.max(max, curr.pressure), 0.5)
		strokePoints.forEach((sp) => {
			sp.pressure = max
			sp.radius = size * easing(0.5 - thinning * (0.5 - sp.pressure))
		})
		return strokePoints
	} else {
		// Calculate initial pressure based on the average of the first
		// n number of points. This prevents "dots" at the start of the
		// line. Drawn lines almost always start slow!
		let p: number
		for (let i = 0, n = strokePoints.length; i < n; i++) {
			strokePoint = strokePoints[i]
			if (strokePoint.runningLength > size * 5) break
			const sp = min(1, strokePoint.distance / size)
			if (simulatePressure) {
				const rp = min(1, 1 - sp)
				p = min(1, prevPressure + (rp - prevPressure) * (sp * RATE_OF_PRESSURE_CHANGE))
			} else {
				p = min(1, prevPressure + (strokePoint.pressure - prevPressure) * 0.5)
			}
			prevPressure = prevPressure + (p - prevPressure) * 0.5
		}

		// Now calculate pressure and radius for each point
		for (let i = 0; i < strokePoints.length; i++) {
			strokePoint = strokePoints[i]
			if (thinning) {
				let { pressure } = strokePoint
				const sp = min(1, strokePoint.distance / size)
				if (simulatePressure) {
					// If we're simulating pressure, then do so based on the distance
					// between the current point and the previous point, and the size
					// of the stroke.
					const rp = min(1, 1 - sp)
					pressure = min(1, prevPressure + (rp - prevPressure) * (sp * RATE_OF_PRESSURE_CHANGE))
				} else {
					// Otherwise, use the input pressure slightly smoothed based on the
					// distance between the current point and the previous point.
					pressure = min(
						1,
						prevPressure + (pressure - prevPressure) * (sp * RATE_OF_PRESSURE_CHANGE)
					)
				}

				let calligraphyFactor = 1
				if (thinning && !simulatePressure && i > 0) {
					calligraphyFactor = calligraphyPenWidth(
						strokePoints[i].input.x,
						strokePoints[i].input.y,
						strokePoints[i - 1].input.x,
						strokePoints[i - 1].input.y,
						1.5,
						0.2,
					)
				}

				strokePoint.radius = size * easing((0.5 - thinning * (0.5 - pressure)) * calligraphyFactor) 

				prevPressure = pressure
			} else {
				strokePoint.radius = size / 2
			}

			if (firstRadius === undefined) {
				firstRadius = strokePoint.radius
			}
		}
	}

	const taperStart =
		start.taper === false
			? 0
			: start.taper === true
			? Math.max(size, totalLength)
			: (start.taper as number)

	const taperEnd =
		end.taper === false
			? 0
			: end.taper === true
			? Math.max(size, totalLength)
			: (end.taper as number)

	if (taperStart || taperEnd) {
		for (let i = 0; i < strokePoints.length; i++) {
			strokePoint = strokePoints[i]
			/*
				Apply tapering

				If the current length is within the taper distance at either the
				start or the end, calculate the taper strengths. Apply the smaller 
				of the two taper strengths to the radius.
			*/

			const { runningLength } = strokePoint

			const ts = runningLength < taperStart ? taperStartEase(runningLength / taperStart) : 1

			const te =
				totalLength - runningLength < taperEnd
					? taperEndEase((totalLength - runningLength) / taperEnd)
					: 1

			strokePoint.radius = Math.max(0.01, strokePoint.radius * Math.min(ts, te))
		}
	}

	if (strokePoints.length <= 2) {
		//strokePoints[0].radius = strokePoints[0].radius / 2
		strokePoints.forEach((sp) => { sp.radius = sp.radius / 2 })
	}

	return strokePoints
}

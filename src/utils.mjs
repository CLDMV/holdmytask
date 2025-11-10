/**
 *	@Project: @cldmv/holdmytask
 *	@Filename: /src/utils.mjs
 *	@Date: 2025-11-08 17:43:09 -08:00 (1762652589)
 *	@Author: Nate Hyson <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Hyson <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2025-11-09 16:22:05 -08:00 (1762734125)
 *	-----
 *	@Copyright: Copyright (c) 2013-2025 Catalyzed Motivation Inc. All rights reserved.
 */

/**
 * A min-heap implementation with custom comparison function.
 * Maintains the heap property where parent nodes are smaller than their children.
 */
export class MinHeap {
	/**
	 * Creates a new MinHeap with a custom comparison function.
	 * @param {Function} compare - Comparison function that returns negative if a < b, positive if a > b, 0 if equal
	 * @example
	 * // Priority queue (higher priority = smaller value)
	 * const heap = new MinHeap((a, b) => a.priority - b.priority);
	 */
	constructor(compare) {
		this.heap = [];
		this.compare = compare;
	}

	/**
	 * Adds an item to the heap, maintaining heap property.
	 * @param {*} item - The item to add to the heap
	 * @returns {void}
	 * @example
	 * heap.push({ value: 5, priority: 1 });
	 */
	push(item) {
		this.heap.push(item);
		this.bubbleUp(this.heap.length - 1);
	}

	/**
	 * Removes and returns the minimum item from the heap.
	 * @returns {*|undefined} The minimum item, or undefined if heap is empty
	 * @example
	 * const min = heap.pop(); // Returns item with smallest comparison value
	 */
	pop() {
		if (this.heap.length === 0) return undefined;
		const root = this.heap[0];
		const last = this.heap.pop();
		if (this.heap.length > 0) {
			this.heap[0] = last;
			this.sinkDown(0);
		}
		return root;
	}

	/**
	 * Returns the minimum item without removing it from the heap.
	 * @returns {*|undefined} The minimum item, or undefined if heap is empty
	 * @example
	 * const min = heap.peek(); // Look at minimum without removing
	 */
	peek() {
		return this.heap[0];
	}

	/**
	 * Returns the number of items in the heap.
	 * @returns {number} The size of the heap
	 * @example
	 * const count = heap.size(); // 5
	 */
	size() {
		return this.heap.length;
	}

	/**
	 * Moves an item up the heap to maintain heap property after insertion.
	 * @param {number} index - Index of the item to bubble up
	 * @returns {void}
	 * @private
	 */
	bubbleUp(index) {
		while (index > 0) {
			const parentIndex = Math.floor((index - 1) / 2);
			if (this.compare(this.heap[index], this.heap[parentIndex]) >= 0) break;
			[this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
			index = parentIndex;
		}
	}

	/**
	 * Moves an item down the heap to maintain heap property after removal.
	 * @param {number} index - Index of the item to sink down
	 * @returns {void}
	 * @private
	 */
	sinkDown(index) {
		const length = this.heap.length;
		while (true) {
			let left = 2 * index + 1;
			let right = 2 * index + 2;
			let smallest = index;

			if (left < length && this.compare(this.heap[left], this.heap[smallest]) < 0) {
				smallest = left;
			}
			if (right < length && this.compare(this.heap[right], this.heap[smallest]) < 0) {
				smallest = right;
			}
			if (smallest === index) break;

			[this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
			index = smallest;
		}
	}
}

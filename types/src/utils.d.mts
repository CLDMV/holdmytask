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
    constructor(compare: Function);
    heap: any[];
    compare: Function;
    /**
     * Adds an item to the heap, maintaining heap property.
     * @param {*} item - The item to add to the heap
     * @returns {void}
     * @example
     * heap.push({ value: 5, priority: 1 });
     */
    push(item: any): void;
    /**
     * Removes and returns the minimum item from the heap.
     * @returns {*|undefined} The minimum item, or undefined if heap is empty
     * @example
     * const min = heap.pop(); // Returns item with smallest comparison value
     */
    pop(): any | undefined;
    /**
     * Returns the minimum item without removing it from the heap.
     * @returns {*|undefined} The minimum item, or undefined if heap is empty
     * @example
     * const min = heap.peek(); // Look at minimum without removing
     */
    peek(): any | undefined;
    /**
     * Returns the number of items in the heap.
     * @returns {number} The size of the heap
     * @example
     * const count = heap.size(); // 5
     */
    size(): number;
    /**
     * Moves an item up the heap to maintain heap property after insertion.
     * @param {number} index - Index of the item to bubble up
     * @returns {void}
     * @private
     */
    private bubbleUp;
    /**
     * Moves an item down the heap to maintain heap property after removal.
     * @param {number} index - Index of the item to sink down
     * @returns {void}
     * @private
     */
    private sinkDown;
}
//# sourceMappingURL=utils.d.mts.map
/** @internal */
class OrderedList<T extends object> {
  private items: T[] = []
  private set = new Set<T>()

  get length() { return this.items.length }

  append(...items: T[]): void {
    for (const item of items) {
      if (this.set.has(item)) return

      this.items.push(item)
      this.set.add(item)
    }
  }

  prepend(...items: T[]): void {
    for (const item of items) {
      if (this.set.has(item)) return

      this.items.unshift(item)
      this.set.add(item)
    }
  }

  replaceItem(oldItem: T, newItem: T): void {
    if (this.set.has(newItem)) return

    const index = this.items.indexOf(oldItem)
    if (index === -1) return

    this.items[index] = newItem

    this.set.delete(oldItem)
    this.set.add(newItem)
  }

  insertBeforeItem(reference: T, newItem: T): void {
    if (this.set.has(newItem)) return

    const index = this.items.indexOf(reference)
    if (index === -1) return

    this.items.splice(index, 0, newItem)
    this.set.add(newItem)
  }

  getFirst(): T | undefined {
    return this.items[0]
  }

  getLast(): T | undefined {
    return this.items[this.items.length - 1]
  }

  has(item: unknown): boolean {
    return this.set.has(item as never)
  }

  delete(item: T): boolean {
    const index = this.items.indexOf(item)
    if (index === -1) return false

    this.items.splice(index, 1)
    this.set.delete(item)
    return true
  }

  deleteAt(index: number): boolean {
    this.set.delete(this.items[index])
    this.items.splice(index, 1)
    return true
  }

  clear(): void {
    this.items = []
    this.set.clear()
  }

  [Symbol.iterator]() {
    return this.items.values()
  }
}

export default OrderedList

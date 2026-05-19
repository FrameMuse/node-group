export function createNode(value: Node | string): Node {
  if (typeof value === "string") return document.createTextNode(value)
  return value
}



export function NodeListItem<T>(this: Array<T>, index: number) {
  return this[index]
}

export function CollectionNamedItem<T extends Element>(this: Array<T>, name: string) {
  return this.find(element => ((element as any).name || element.id) === name) ?? null
}
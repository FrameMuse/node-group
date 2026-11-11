import OrderedList from "./OrderedList"
import { CollectionNamedItem, createNode, NodeListItem } from "./utils"



// interface GroupOptions {
//   /**
//    * Ensures child nodes are always presented in the targeted parent.
//    */
//   lockChildren?: boolean
//   /**
//    * Pipes through child nodes to the targeted parent. Appending to the group
//    */
//   streamChildren?: boolean
// }

/**
 * A minimal version of document that stores a segment of a document structure just like `DocumentFragment`.
 * The key difference is that, it does affect the document and cause reflow when attached to a document,
 * while it does not have explicit wrapper like regular elements.
 * 
 * [DOM Proposal](https://github.com/whatwg/dom/issues/736)
 */
class Group extends HTMLElement implements ChildNode {
  /** @internal */
  orderedNodes = new OrderedList<Node & Partial<ChildNode>>

  /** @internal */
  connectedCallback() {
    super.after(...this.orderedNodes)
    super.remove()
  }

  /** @internal */
  disconnectedCallback() { }

  after(...nodes: (Node | string)[]): void {
    this.orderedNodes.getLast()?.after?.(...nodes)
  }
  before(...nodes: (Node | string)[]): void {
    this.orderedNodes.getFirst()?.before?.(...nodes)
  }
  remove(): void {
    for (const node of this.orderedNodes) {
      if (node == null) continue
      node.remove?.()
    }
  }
  replaceWith(...nodes: (Node | string)[]): void {
    const realNodes = nodes.map(createNode)
    this.after(...realNodes)

    const kept = new Set<Node>(realNodes)
    for (const node of this.orderedNodes) {
      if (node == null || kept.has(node)) continue
      node.remove?.()
    }
  }

  override get children() {
    const elements = [...this.orderedNodes].filter(node => node instanceof HTMLElement)
    const collection: HTMLCollection = elements as never

    collection.item = NodeListItem
    collection.namedItem = CollectionNamedItem

    return collection
  }
  override get childNodes() {
    const nodes: ChildNode[] = [...this.orderedNodes] as ChildNode[]
    const nodeList: NodeListOf<ChildNode> = nodes as never

    nodeList.item = NodeListItem
    return nodeList
  }



  override appendChild<T extends Node>(node: T): T {
    if (node === this as never) return node

    this.after(node)
    this.orderedNodes.append(node)
    return node
  }
  override removeChild<T extends Node>(child: T): T {
    if (this.orderedNodes.delete(child)) (child as Partial<ChildNode>).remove?.()
    return child
  }

  override replaceChild<T extends Node>(node: Node, child: T): T {
    if (node === child as Node) return child
    if (this.orderedNodes.has(child) === false) return child

    this.orderedNodes.delete(node)
    ;(child as Partial<ChildNode>).replaceWith?.(node)
    this.orderedNodes.replaceItem(child, node)

    return child
  }
  override replaceChildren(...nodes: (Node | string)[]): void {
    const realNodes = nodes.map(createNode)
    if (this.orderedNodes.equals(realNodes)) return

    const oldNodes = [...this.orderedNodes]
    const kept = new Set<Node>(realNodes)

    // Place the new sequence before an outgoing child. `before` is used rather than `parentNode`
    // checks so nested groups (which never sit in the DOM themselves) delegate to their own nodes.
    if (realNodes.length > 0) {
      const anchor = oldNodes.find(node => kept.has(node) === false) ?? oldNodes[0]
      anchor?.before?.(...realNodes)
    }

    for (const oldNode of oldNodes) {
      if (kept.has(oldNode)) continue
      oldNode.remove?.()
    }

    this.orderedNodes.reset(realNodes)
  }

  override append(...nodes: (Node | string)[]): void {
    const realNodes = nodes.map(createNode)

    this.after(...realNodes)
    this.orderedNodes.append(...realNodes)
  }
  override prepend(...nodes: (Node | string)[]): void {
    const realNodes = nodes.map(createNode)

    this.before(...realNodes)
    this.orderedNodes.prepend(...realNodes)
  }

  override insertBefore<T extends Node>(node: T, child: Node | null): T {
    if (node === child as Node) return node
    if (child == null || this.orderedNodes.has(child) === false) {
      // Moving an existing child to the end: drop it first so `append` re-adds it.
      this.orderedNodes.delete(node)
      this.append(node)
      return node
    }

    this.orderedNodes.delete(node)
    ;(child as Partial<ChildNode>).before?.(node)
    this.orderedNodes.insertBeforeItem(child, node)
    return node
  }

  override contains(other: Node | null): boolean { return !!other && this.orderedNodes.has(other) }

  override get textContent() {
    let result = ""

    for (const node of this.orderedNodes) { result += node.textContent }

    return result
  }

  override get firstChild() {
    return (this.orderedNodes.getFirst() as ChildNode | undefined) ?? null
  }

  override get lastChild() {
    return (this.orderedNodes.getLast() as ChildNode | undefined) ?? null
  }

  override hasChildNodes(): boolean { return this.orderedNodes.length > 0 }

  static readonly TAG = "group-pointer"
  static {
    if (window.customElements.get(Group.TAG) == null) {
      window.customElements.define(Group.TAG, Group)
    }
  }
}

export default Group

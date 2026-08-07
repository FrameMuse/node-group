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
    this.after(...nodes)

    for (const node of this.orderedNodes) {
      if (node == null) continue

      nodes.includes(node)
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

    this.orderedNodes.append(node)
    this.after(node)
    return node
  }
  override removeChild<T extends Node>(child: T): T {
    this.orderedNodes.delete(child)
    return child
  }

  override replaceChild<T extends Node>(node: Node, child: T): T {
    this.orderedNodes.replaceItem(child, node)

    return child
  }
  override replaceChildren(...nodes: (Node | string)[]): void {
    if (nodes.every(node => this.orderedNodes.has(node))) return

    const oldNodesSnapshot = [...this.orderedNodes]

    this.append(...nodes)

    for (const oldNode of oldNodesSnapshot) {
      if (nodes.includes(oldNode)) continue

      oldNode.remove?.()
      this.orderedNodes.delete(oldNode)
    }
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
    if (child != null) {
      this.orderedNodes.insertBeforeItem(child, node)
    }
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

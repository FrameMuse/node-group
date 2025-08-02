import OrderedList from "./OrderedList"

interface CustomElementLifecycle {
  connectedCallback?(): void;
  disconnectedCallback?(): void;
  attributeChangedCallback?(name: string, oldValue: string | null, newValue: string | null): void;
}

/** @internal */
class GroupRelayElement extends HTMLElement implements CustomElementLifecycle {
  declare readonly group: Group

  connectedCallback() {
    this.hidden = true
    this.group.connectedCallback()
  }

  disconnectedCallback() {
    this.group.disconnectedCallback()
  }

  override remove(): void { this.group.remove() }
  override get textContent() { return this.group.textContent }

  static readonly TAG = "group-relay"
  static {
    if (window.customElements.get(GroupRelayElement.TAG) == null) {
      window.customElements.define(GroupRelayElement.TAG, GroupRelayElement)
    }
  }
}


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
class Group extends DocumentFragment implements ChildNode {
  /** @internal */
  orderedNodes = new OrderedList<Node & Partial<ChildNode>>

  /**
   * Connection event relay element.
   * Initially added to the group.
   *
   * When group brings nodes to a parent, relay element relays connection callbacks and returns back to group.
   * 
   * @internal
   */
  relayElement = document.createElement(GroupRelayElement.TAG) as GroupRelayElement

  constructor() {
    super()

    super.appendChild(this.relayElement)
    // @ts-expect-error yes
    this.relayElement.group = this
  }

  /** @internal */
  connectedCallback() {
    // Append group nodes to targeted parent.
    this.relayElement.after(...this.orderedNodes)
    // Return tap.
    super.appendChild(this.relayElement)
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
    if (node === this.relayElement as never) return node

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

    for (let i = 0; i < oldNodesSnapshot.length; i++) {
      const oldNode = oldNodesSnapshot[i]
      if (nodes.includes(oldNode)) continue

      oldNode.remove?.()
      this.orderedNodes.deleteAt(i)
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

  // override getElementById(elementId: string): HTMLElement | null {}

  // static parentOf(child: ChildNode): Group | ParentNode | null {
  //   if (child instanceof)
  //     return child.parentNode
  // }
}

export default Group

function createNode(value: Node | string): Node {
  if (typeof value === "string") return new Text(value)
  return value
}



function NodeListItem<T>(this: Array<T>, index: number) {
  return this[index]
}

function CollectionNamedItem<T extends Element>(this: Array<T>, name: string) {
  return this.find(element => ((element as any).name || element.id) === name) ?? null
}
import "./dom"

// File: src/main.test.ts
// Bun >= v1.0 includes built-in test runner. No need for Jest/Mocha.
// Run: bun test
import { beforeEach, describe, expect, it } from "bun:test"

import Group from "../src/Group"

describe("Group behaviour", () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it("should behave like a moving document-fragment", () => {
    const parent1 = document.createElement("div")
    const parent2 = document.createElement("div")

    const group = new Group
    group.append("A", "B", "C")

    parent1.append(group)
    document.body.append(parent1)
    expect(parent1.textContent).toBe("ABC")

    parent2.append(group)
    document.body.append(parent2)
    expect(parent1.textContent).toBe("")
    expect(parent2.textContent).toBe("ABC")
  })

  it("should accept any mix of Node/strings", () => {
    const group = new Group

    const X = document.createTextNode("X")
    const Y = document.createElement("span")
    Y.textContent = "Y"

    group.append(X, Y, "Z")
    expect(group.textContent).toBe("XYZ")
  })

  it("should allow append *after* being attached", () => {
    const group = new Group

    const p = document.createElement("p")
    p.textContent = "Foo"

    group.append("Foo")

    const container = document.createElement("div")
    container.append(group)
    document.body.append(container)

    group.append("Bar", document.createTextNode("Baz"))

    expect(container.textContent).toBe("FooBarBaz")
    expect(group.childNodes.length).toBe(3)
  })

  it("should reflect DOM length", () => {
    const group = new Group
    group.append("1", "2")

    const c1 = document.createElement("ol")
    c1.append(group)
    document.body.append(c1)

    expect(c1.childNodes.length).toBe(2)
    expect(group.childNodes.length).toBe(2)

    const c2 = document.createElement("ol")
    c2.append(group)
    document.body.append(c2)

    expect(c1.childNodes.length).toBe(0) // Nodes were moved.
    expect(c2.childNodes.length).toBe(2)
    expect(group.childNodes.length).toBe(2)

  })

  it("should replace all children without losing remoteness", async () => {
    const comment = new Comment("$")

    const group = new Group
    group.append(comment)


    const container = document.createElement("div")
    container.append(group)
    document.body.append(container)

    group.replaceChildren("X")

    expect(group.textContent).toBe("X")
    expect(container.innerHTML).toBe("X")

    group.replaceChildren(comment)
    group.replaceChildren("J", "Y")

    expect(group.textContent).toBe("JY")
    expect(container.innerHTML).toBe("JY")

    group.replaceChildren(comment)
    group.replaceChildren("J2", "Y2")

    expect(group.textContent).toBe("J2Y2")
    expect(container.innerHTML).toBe("J2Y2")
  })
})

describe("Group between disconnected parents", () => {
  // https://github.com/FrameMuse/node-group/issues/3

  it("should place children in the last parent when moved between disconnected parents", () => {
    const parent1 = document.createElement("div")
    const parent2 = document.createElement("div")

    const group = new Group
    group.append("A", "B", "C")

    // Both parents are disconnected from the DOM, no lifecycle callbacks fire.
    parent1.append(group)
    parent2.append(group)

    // Now connect both parents to the DOM.
    document.body.append(parent1, parent2)

    // Children should land in parent2, the last parent the group was moved to.
    expect(parent1.textContent).toBe("")
    expect(parent2.textContent).toBe("ABC")
  })
})

describe("Snapshot of document structure (advanced)", () => {
  it("snaps consistent node tree after sequential operations", () => {
    const group = new Group

    const p = document.createElement("p")
    group.append(p)
    group.append("X")
    group.append("?")
    group.append("Y")

    const container = document.createElement("div")
    container.append(group)
    document.body.append(container)

    const html = container.innerHTML
    expect(html).toMatchSnapshot()
  })
})

describe("Group mutations keep the DOM and the group in sync", () => {
  function connected(...initial: (Node | string)[]) {
    const group = new Group
    group.append(...initial)
    const container = document.createElement("div")
    container.append("[", group, "]")
    document.body.replaceChildren(container)
    return { group, container }
  }
  const text = (node: Node) => node.textContent

  it("replaceChildren with a subset removes the rest", () => {
    const a = new Text("A"), b = new Text("B")
    const { group, container } = connected(a, b)

    group.replaceChildren(a)

    expect(container.textContent).toBe("[A]")
    expect([...group.childNodes].map(text)).toEqual(["A"])
  })

  it("replaceChildren reorders existing children", () => {
    const a = new Text("A"), b = new Text("B"), c = new Text("C")
    const { group, container } = connected(a, b, c)

    group.replaceChildren(c, "X", a)

    expect(container.textContent).toBe("[CXA]")
    expect([...group.childNodes].map(text)).toEqual(["C", "X", "A"])
  })

  it("replaceChildren with identical children is a no-op", () => {
    const a = new Text("A"), b = new Text("B")
    const { group, container } = connected(a, b)

    group.replaceChildren(a, b)

    expect(container.textContent).toBe("[AB]")
  })

  it("replaceWith keeps nodes that are part of the replacement", () => {
    const a = new Text("A"), b = new Text("B")
    const { group, container } = connected(a, b)

    group.replaceWith(b, "Z")

    expect(container.textContent).toBe("[BZ]")
  })

  it("insertBefore places the node in the DOM when connected", () => {
    const a = new Text("A"), c = new Text("C")
    const { group, container } = connected(a, c)

    group.insertBefore(new Text("B"), c)
    group.insertBefore(new Text("D"), null)

    expect(container.textContent).toBe("[ABCD]")
    expect([...group.childNodes].map(text)).toEqual(["A", "B", "C", "D"])
  })

  it("insertBefore moves an existing child", () => {
    const a = new Text("A"), b = new Text("B"), c = new Text("C")
    const { group, container } = connected(a, b, c)

    group.insertBefore(c, a)

    expect(container.textContent).toBe("[CAB]")
    expect([...group.childNodes].map(text)).toEqual(["C", "A", "B"])
  })

  it("removeChild removes the node from the DOM", () => {
    const a = new Text("A"), b = new Text("B")
    const { group, container } = connected(a, b)

    group.removeChild(a)

    expect(container.textContent).toBe("[B]")
    expect([...group.childNodes].map(text)).toEqual(["B"])
  })

  it("replaceChild swaps the node in the DOM", () => {
    const a = new Text("A"), b = new Text("B")
    const { group, container } = connected(a, b)

    group.replaceChild(new Text("X"), a)

    expect(container.textContent).toBe("[XB]")
    expect([...group.childNodes].map(text)).toEqual(["X", "B"])
  })

  it("prepend keeps argument order", () => {
    const { group, container } = connected("C")

    group.prepend("A", "B")

    expect(container.textContent).toBe("[ABC]")
    expect([...group.childNodes].map(text)).toEqual(["A", "B", "C"])
  })
})

describe("Nested groups", () => {
  it("replaceChildren swaps one nested group for another", () => {
    const inner1 = new Group, inner2 = new Group
    inner1.append("A1", "A2")
    inner2.append("B1", "B2")

    const outer = new Group
    outer.append(inner1)
    const container = document.createElement("div")
    container.append("[", outer, "]")
    document.body.replaceChildren(container)
    expect(container.textContent).toBe("[A1A2]")

    outer.replaceChildren(inner2)
    expect(container.textContent).toBe("[B1B2]")

    outer.replaceChildren(inner1)
    expect(container.textContent).toBe("[A1A2]")

    outer.replaceChildren("X")
    expect(container.textContent).toBe("[X]")
  })
})

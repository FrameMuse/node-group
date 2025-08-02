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

  it("should replace all children without losing remoteness", () => {
    const group = new Group
    group.append("Y")

    const container = document.createElement("div")
    container.append(group)
    document.body.append(container)

    group.replaceChildren("X")

    expect(group.textContent).toBe("X")
    expect(container.innerHTML).toBe("X")
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

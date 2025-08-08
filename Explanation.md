*For this library, the following would be true:*

Consider you have this `Group` setup:
```js
const group = new Group
group.append("A", "B", "C")
```
Then the diagram would be:
```js
Group
 ├─ A
 ├─ B
 └─ C

document
└─ body // No children.
```

Adding a group to a parent (that is attached to `document`, it is required due to `connectedCallback` reliance) would look like that:
```js
const parent = document.createElement("div")
parent.append(group)

// document.body.append(parent) // The order doesn't matter, though for group to appear in the `parent`, must be attached to a `document` in some way.
```
This diagram would represent it:
```js
Group
 ├─ A
 ├─ B
 └─ C

document
└─ body
   ├─ A
   ├─ B
   └─ C
```

Let's break down this diagram in terms of properties (interfaces):

- Accessing any properties of `group` will (*should*) be 100% same as `DocumentFragment` in the moment it is not yet connected anywhere (which flushes its children), expect those that are `null` by design like `nextSibling` or `parent`.
- `childNodes` of `group` are both in `group` and `document.body`
```js
group.childNodes // ["A", "B", "C"]
document.body.childNodes // ["A", "B", "C"]
```
- `parent` return the parent where `group` was previously attached to - the same with other properties.

In short, `group` behaves just like a normal `ParentNode`.

---

That was a simple part, let's see what probably confuses people:

- `group` node itself can't be find in the `document`, even if attached and `parent` property shows it is. :exploding_head: 
- `group` node doesn't have a wrapper and is completely transparent to CSS selectors, Box View Model and Layout.

In short, `group` is a virtual node, but faking to be real `ParentNode`.
Another interpretation would be "a `NodeList` with `ParentNode` and `ChildNode` interfaces".

---

Unaffected `group` children for special elements like `table`, `select`:
In contradiction to other parent elements, `group` will never mess up with its children, they are attached as given, you will never face a situation where elements are forcefully formatted in `group` node when it's being attached since `group` is a limbo.

---

Adding `group` in between other elements:

```js
group.append(A, B, C)
document.body.append(X, Y, Z)
```
:arrow_down: 
```js
Group
├─ A
├─ B
└─ C

(document)
└─ body
   ├─ X
   ├─ Y
   └─ Z
```

Now let's add the `group` before `Y`
```js
document.body.insertBefore(group, Y)
```
:arrow_down: 
```js
Group
├─ A
├─ B
└─ C

(document)
└─ body
   ├─ X
   ├─ A
   ├─ B
   ├─ C
   ├─ Y
   └─ Z
```

Expectations
```js
console.log(group.firstChild === A)          // true
console.log(A.parentNode === document.body)  // true
console.log(X.nextSibling === A)             // true
console.log(C.nextSibling === Y)             // true
```

---

Accessing properties of children that are part of `group`:
Reading node properties always reflects the "real" tree - not the `Group` logical ownership.

```js
group.append(A, B, C)
```
:arrow_down: 
```js
Group
├─ A
├─ B
└─ C

(document)
└─ body // No children.
```
:arrow_down: 
```js
console.log(group.firstChild === A)  // true
console.log(A.parentNode === null)   // true
console.log(A.isConnected === false) // true
console.log(A.nextSibling === null)  // true
```

Now connect `group`

```js
document.body.append(group)
```
:arrow_down: 
```js
Group
├─ A
├─ B
└─ C

(document)
└─ body
   ├─ A
   ├─ B
   └─ C
```
:arrow_down: 
```js
console.log(group.firstChild === A)           // true
console.log(A.parentNode === document.body)   // true
console.log(A.isConnected === true)           // true
console.log(A.nextSibling === B)              // true
```

While this may look confusing and not intuitive, in practice it's not bothering at all since `group` is treated as `NodeList` you can put to the `document` with `append` method.

---

## Comparing this behavior to Figma and Photoshop

| Feature / Expectation                         | Figma / Photoshop                                                       | NodeGroup (logical `Group`)                                                                         |                                                                      Impact (what breaks in mental model) | Recommendation / Fix                                                                                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------: | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Group is a real parent / folder               | Group is a first-class parent node in the layer tree.                   | `Group` is a logical owner; children remain real DOM nodes with real DOM parents.                   | Users expect `node.parent === group`. They get physical parents instead. Confusion and buggy assumptions. | Document clearly. Provide `group.contains(node)` and `group.indexOf(node)`.                                                                   |
| Empty group visible in UI                     | Empty folder shows in layers panel and can be selected.                 | Empty group is usually a no-op (no DOM node inserted).                                              |                                      Cannot anchor selectors or apply transforms; empty groups invisible. | Offer optional `relay` placeholder `<span data-group-relay>` or `group.wrap()` to create a container.                                         |
| Move group = single operation                 | Move folder moves children as a single unit in UI and undo stacks.      | Moving group inserts/moves each child individually in DOM (multiple DOM ops).                       |                                      More DOM mutations, more expensive reflows, different undo behavior. | Batch moves with `DocumentFragment`, or provide `group.moveTo(parent, ref)` that batches operations.                                          |
| Selection highlights group and children       | Selecting folder selects all child layers visually.                     | Selecting group object is conceptual; DevTools selection targets physical nodes.                    |                    Tooling and keyboard UX differ; users cannot click a single folder to affect children. | Expose `group.select()` that annotates/highlights child nodes or toggles a relay class.                                                       |
| Folder-level transforms / masks / blend modes | Transform/mask applies once to the folder and cascades to children.     | No inherent group-level composition; must apply transforms per child or wrap in container.          |                                                      Hard to apply group transforms or masks efficiently. | Provide `group.wrap({tag, class})` or an optional relay that becomes the composition surface.                                                 |
| Querying / CSS selectors                      | Layers/folders can be targeted by UI layer queries.                     | DOM selectors operate on physical DOM only; logical grouping is invisible to CSS selectors.         |                                                 Selectors, `querySelector`, and CSS cannot target groups. | Document this; add `group.querySelector` that searches `group.children` logically.                                                            |
| Event path / pointer capture                  | Events and selection operate on the folder as a node.                   | Events follow physical DOM; group object does not appear in `composedPath()`.                       |                                     Event handling assumptions break; `event.target` never shows `group`. | If you use a relay container, events will reflect that container. Provide `group.on()` helpers to add listeners to all children or the relay. |
| Instances / components                        | Components and instances are first-class: detach, reset, overrides.     | `Group` is not a component system; no instance lifecycle.                                           |                                 Users expecting replaceable/reusable grouped components are disappointed. | Build a separate Component/Instance layer on top of Group for reuse semantics.                                                                |
| DevTools visibility                           | Layers panel shows the folder.                                          | DevTools show only DOM nodes; Group object is invisible unless you add debugging hooks.             |                                                      Harder to inspect group membership in browser tools. | Provide a dev-mode relay/class and `data-group-id` attributes for debugging.                                                                  |
| Undo / History semantics                      | Single operation for moving/renaming a folder.                          | Multiple DOM mutations may produce multiple history entries in frameworks.                          |                                                  Harder to reason about undo, animations, or transitions. | Batch operations and expose high-level APIs that perform single logical mutations.                                                            |
| Performance for many children                 | Folder move is a single conceptual op; implementations may optimize.    | Inserting many children may trigger many reflows/mutations if not batched.                          |                                                    Jank if naive; MutationObservers triggered many times. | Use `DocumentFragment` internally or use a relay swap strategy to minimize layout thrash.                                                     |
| Accessibility                                 | Folder can be exposed to assistive tech as a group.                     | No automatic ARIA grouping unless you wrap children in an element with ARIA attributes.             |                                                            Screen readers will not see the logical group. | Offer `group.wrap({role:'group', 'aria-label':...})` helper.                                                                                  |
| Serialization / export                        | Groups serialize naturally in layer/export formats.                     | Group is a logical list; exporting DOM may lose the group unless you serialize group metadata.      |                                           Harder to export the group structure for tools or file formats. | Provide `group.serialize()` that emits a portable representation (children + metadata).                                                       |
| CSS layout / stacking context                 | Folder can create a stacking context / transform once for all children. | Without a wrapper each child may need its own stacking context; group-level stacking not automatic. |                                                    Visual composition differs from designer expectations. | Support optional wrapper/relay to host stacking context and transforms.                                                                       |
| Predictable `parentNode` / DOM navigation     | `layer.parent` matches group.                                           | `node.parentNode`, `nextSibling`, etc., always reflect physical DOM.                                |                                                 Code that navigates DOM expecting group semantics breaks. | Provide logical navigation helpers: `logicalNextSibling(group, node)` etc., and document the difference.                                      |

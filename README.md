# Group

Live virtual parent for nodes. Transparent group of nodes. No DOM patching. Production targeted.

```js
const parent1 = document.createElement("div")
parent1.style.background = "hsl(0 40% 60%)"

const parent2 = document.createElement("div")
parent2.style.background = "hsl(200 40% 60%)"


const group = new Group
group.append("123", "456", "789")

parent1.append(group) // So far acts exactly as `DocumentFragment`.
parent2.append(group) // The difference is that the nodes are actually moved.

group.append("000") // And changing nodes of `group` will be reflected in the `parent2`.
```

`group` is transparent to CSS Selectors, Box Model and Layout Flow,
while changes to `group` are streamed to `parent1` - allowing **remote nodes rearranging** or **owned nodes area**.

---

This is trying to follow as many aspects as possible from [my comment](https://github.com/whatwg/dom/issues/736#issuecomment-2804689564).
Even though it has several "flaws" or deviations since this implementation sets "No DOM patching" as a goal.
Meaning some things may not be possible to fully implement. Other things may not be implemented

This is an implementation variant of [DOM `DocumentPersistentFragment` proposal](https://github.com/whatwg/dom/issues/736).

[Another implementation variant](https://github.com/WebReflection/group-nodes) is made by @WebReflection.

## Motivation

React impacted Web development a lot by introducing JSX.
It shifted element composition from "Side Effect" to "Ownership Sharing".
And as 1/3 of developers use React (including **me**), it not only shifts this paradigm for people who uses React,
it also affects how people perceive VanillaJS after using React.

I can talk only for myself, but seeing [this proposal](https://github.com/whatwg/dom/issues/736),
it tells me I'm not alone in thinking we need to inherit best practices from React.

I started this project as an experiment since React recently become too conservative,
which led to me to understand VanillaJS in a such way that made me realize, it actually could be better than React.

By adopting best things from React like JSX, Fragments, Lifecycle events and "Ownership Sharing" element composition,
VanillaJS can easily become the only tool I need to build UI on the daily.

My proposal of `NodeGroup` and this implementation without DOM patching is my attempt to make this future closer.

I'm also willing to (at least trying to) make this production-ready product,
I'm and using this in React/SolidJS-like [ui building library](https://github.com/denshya/proton).

### "Ownership Sharing"

[@robbiespeed comment](https://github.com/whatwg/dom/issues/736#issuecomment-2802918087) covers this neatly, I also have exact same impression when doing [my own research](https://stackblitz.com/edit/vitejs-vite-t6fx51uo?file=src%2Fcounter.js).

### Fragments

This implementation is exactly about fragments, which allows proper "Ownership Sharing" in VanillaJS.

## Serialization/Parsing

The plan is to implement either range-based grouping

```html
<div>
  <group-relay data-range="4"></group-relay>
  <!-- Three next nodes, including comments -->
  <div>1</div>
  <div>2</div>
  <div>3</div>
  <div>Not included</div>
</div>
```

or children-based one

```html
<div>
  <group-relay>
    <!-- Three next nodes, including comments -->
    <div>1</div>
    <div>2</div>
    <div>3</div>
  </group-relay>
  <div>Not included</div>
</div>
```

You can do it yourself by using [@robbiespeed comment](https://github.com/whatwg/dom/issues/736#issuecomment-2759861429).

## Naming

One of the proposed feature of `NodeGroup` is **named groups**.

```html
<group-relay name="myGroup"></group-relay>
```

Which are parsed and added to `document.groups` by names.
This is not possible without DOM patching (even little one).

If anyone shows interest in having this feature, it can be added as `Group.list`.

## Parent Strategies

There are two parent determining strategies:

- Nodes read `parentNode` as a targeted parent of `group` as if nodes are attached without `group`.
- Nodes read `parentNode` as `group` as if they were direct children of `group`, while actually being not.

Both these approaches cause confusion ([@justinfagnani comment](https://github.com/whatwg/dom/issues/736#issuecomment-2807940071)).

> [!Note]
> In current implementation, the children of the group are not patched,
> meaning they will read their `parentNode` as if nodes are attached without `group`.

## How it works

It uses custom element lifecycle callbacks to indicate where `Group`, which extends `DocumentFragment`, was attached to.
Then the custom element, i.e. `<group-relay />` is returned back to `Group` for future attachments.

`Group` overrides several properties and methods to pretend it is attached to a parent and is actively carrying nodes.
`<group-relay />` also overrides properties and methods to mirror `Group` behavior in case it is mistakenly referenced somewhere.

> [!Note]
> Don't worry, referencing or manipulate `<group-relay />` should be ok.
> It acts as `Group`, `DocumentFragment` can't exist in DOM while custom elements can, so `Group` needs a relay.
>
> `<group-relay />` represents a live `Group` node, but as relaying mechanism, that's why it's called `group-relay`.

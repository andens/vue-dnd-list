## Usage

The `orientation` property determines whether the list is horizontal (`x`) or vertical (`y`).

The `lockAxis` property locks dragging to the axis defined by the `orientation` property if true. Otherwise the facade item may be moved freely. Defaults to false.

The `scrollContainerClass` property is the class to apply to the wrapper element around sortable items. Defaults to `dnd-scroll-container`.

The `transitionName` property sets the `name` property of the internal `transition` elements. Default to `dnd-list`.

The `listItemClass` property defines a class that is applied to the element that wraps individual list items. Defaults to `dnd-list-item`. This class is also applied to the helper item.

The `helperItemClass` property defines a class that is applied to the helper wrapper element. Defaults to `dnd-helper-item`.

The `itemKeyProperty` property tells `vue-dnd-list` what property of items in `v-model` to use as key in the rendered HTML. Defaults to using the item index as key.

The `helperItemKey` property is the key to use for the helper item. Defaults to `-1`.

The `activationDelay` property specifies a delay until sorting is activated after starting to drag. If `activationDistance` is also specified, `activationDelay` takes precedence.

The `activationDistance` property specifies a distance that must be dragged before sorting is activated. If `activationDelay` is also specified, `activationDelay` takes precedence.

The `helperZ` property sets the z-index to use for the wrapper of the helper item. It's a bit of a hack to work around some transition issues where the use of transform creates a new stacking context for the helper item as it's being transitioned, making its z-index independent of the other items. Defaults to 0.

The `maxItemTransitionDuration` property is the duration in milliseconds for items to transition into place after being swapped. It's prefixed with _max_ because it is the duration for a clean swap; interrupting currently transitioning items do not reset the transition time but rather finishes in less time based on how far they have already transitioned. A value greater than 0 enables the transition, during which a `<name>-move` class is applied, where `<name>` is given by the `transitionName` property. Defaults to 0.

The `scrollContainerEvents` property is an object of event handlers that are bound to the scroll container. Defaults to null.

The `autoscrollTopSpeed` property is the maximum scroll speed when autoscrolling.

The `autoscrollTopSpeedProtrusion` is the protrusion at which the autoscroll reaches its maximum scroll speed.

`listTerminator`: If true, an empty div is inserted after the last list item.
Defaults to false.

_The original reason for adding a terminator item was to prevent collapsing behavior when swapping the rightmost item when the scroll container is a flexbox.
Without the terminator item the flexbox would shrink to fit the items being translated, causing choppy autoscroll behavior.
With a terminator item this doesn't happen because there is another element the container must wrap, albeit invisible._

`listTerminatorClass`: The class that will be applied to the terminator item.
Defaults to `dnd-terminator`.

`reverse-rendering`: Switches internal logic to account for a reversed rendering order of list items when for example `flex-direction: row-reverse` is used.

The `sort-end` event is emitted when sorting finishes. If sorting has become activated, this happens when the mouse button is released, otherwise it happens when the helper item has settled into place.

The slot content is repeated for each element in `v-model` and scoped with the following data:

* `listItem` - Element data of `v-model`.
* `index` - Index of the element in `v-model`.
* `isGhost` - True for the item that is chosen for dragging.
* `isHelper` - True for the helper item.
* `sorting` - Specifies whether sorting is active or not.
* `settling` - Specifies whether sorting has recently finished and transitions are settling.
* `startDrag` - Selects the item for dragging. Intended to be called in response to a `mousedown` event on the areas of the list items that the user wants to be draggable.

Note that an item can be a ghost despite not actively sorting. This happens before sorting has been activated due to press delay and drag threshold constraints, if used. It also happens during the settling phase after sorting has ended.

Helper item markup can be provided in a slot named `helper`. If not present, the main slot is used for the helper item. Both kinds of slots are scoped the same way. The facade item is rendered outside of the scroll container such that it does not interfere with the scroll dimensions when dragged beyong the container bounds.

If the list items change viewport position under circumstances beyond the control of `vue-dnd-list` while sorting is active, `synchronizeHelperTranslation` may be called on a `SortableContainer` instance to immediately synchronize the helper position. This moves the helper item into place and sorts items according to the updated position.

When the facade item is removed, the `left` and `right` styles are set to match the target element position. The `transform` style is set to offset the item to where it was when dropped. With this the user can transition the facade during the settling phase. Remember, using `!important` for the `transform` property overrides the inline style.

## Internal details

`NodeTracker` is used to track a sorted array of nodes that corresponds to the elements in `value`. `ListItem` instances update the tracker as they are created, destroyed, and detect changes in their `index` property.

Directives were investigated, but a separate component could look for changes specifically in index. Considering that it didn't work to just pass the container instance, a separate object had to be used and dependency injection turned out to be a clean way of doing so (as in vue-slicksort).

The helper node is also tracked in `NodeTracker`. Emitting an event from the helper item component when it's destroyed doesn't work as the transition continues. Instead, we need to check whether the `after-leave` invocation was done for the helper node. Using the node tracker we can compare against the element that the helper added.

### Reverse rendering

In order to support using `flex-direction: row-reverse` (or column) for the scroll container, some calculations have to be done differently.
This mostly applies to calculations of `helperTranslation`, where we can't use `offsetLeft`/`offsetTop` directly because in this case they don't work the same.

Normally, `offsetLeft` of items would look something like this with respect to the scroll container (a is the maximum `scrollLeft` value and b is `scrollWidth`):
```
0                         a             b
┍━━━━━━━━━━━━━━━━━━━━━┑
┃◁                       ############▷┃
┕━━━━━━━━━━━━━━━━━━━━━┙
```

When using reverse rendering, it seemed to look like this instead:
```
-a                        0             b-a
┍━━━━━━━━━━━━━━━━━━━━━┑
┃◁                       ############▷┃
┕━━━━━━━━━━━━━━━━━━━━━┙
```

For that reason, usage of `offsetLeft` and `offsetTop` values are shifted accordingly to bring them into the coordinate system that is assumed for other calculations.

However, that is not enough.
Reversing elements also reverses the item indices, which is why the checking direction is inverted when sorting items and swapping them.

## Inspiration

This is a support library for `vue-chromish-tabs` and written with its requirements in mind. `vue-dnd-list` is heavily inspired by `vue-slicksort`, but adapted mostly in terms of using slots and with different swapping and autoscroll behaviors. `vue-dnd-list` was written with my use case of a horizontal sortable list in mind. Although untested, the component includes equivalent functionality for a vertical list.

## To future self

I should probably scrap the transitions. `transition-group` didn't play nice with swapping items mid-transition, and individual `transition` elements don't seem to trigger enter transitions (likely because the `transition` element itself is removed; not the element within it). Leave transitions do seem to trigger, but since items are not in a group the placeholder item is simply appended instead of considering the other items.

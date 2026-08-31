# Future Ideas — Frame Calculator

Things intentionally deferred from v1 to keep scope manageable.

---

## Artwork / Mat Input
- **Separate mat configuration**: Let the user specify artwork size AND mat border width as independent inputs, instead of measuring the combined mat+art size. This would require adding mat overlap, mat border, and a toggle for "is mat already mounted."
- **Multiple mat layers**: Support double or triple mat packages with different border widths per layer.

## Frame Join Types
- **Splined miter**: Note the spline groove dimensions needed beyond the standard 45° miter.
- **Bridle / box joint**: Alternative joint type for heavy or ornate frames.
- **Floating mount / shadow box**: No rabbet, canvas hangs inside without glazing.

## Glazing Options
- **Glass vs. acrylic toggle**: Different clearances and weight implications depending on material.
- **UV / anti-reflective coatings**: Notes on thickness differences for specialty glazing.
- **No glazing**: For canvas wraps, open frames, or artwork that shouldn't be glazed.

## Output & Export
- **PDF / printable cut sheet**: Formatted one-page shop printout with all dimensions, a parts diagram, and a checklist.
- **SketchUp-friendly output**: Exact XYZ dimensions formatted for direct entry into SketchUp models.
- **Copy to clipboard per dimension**: Click any result to copy it.
- **Metric / mm support**: Toggle between inches and millimeters throughout.

## Visual / UX
- **3D cross-section illustration**: An interactive 3D or isometric corner diagram that updates as you type.
- **Named frame presets**: Save common frame profiles (e.g., "Oak 3×3/4", "Walnut 2.5×1") and recall them instantly.
- **Dark mode theme**: Toggle using CSS variable swapping.
- **Measurement input as fractions**: Let users type "2 3/4" instead of "2.75" in input fields.

## Validation & Safety
- **Grain direction note**: Warn when the calculated piece length exceeds common lumber lengths (8 ft, 10 ft, 12 ft).
- **Rabbet feasibility check**: Warn if rabbet depth + remaining lip is less than a safe minimum.
- **Square check**: Prompt user to diagonal-measure the assembled frame before the glue sets.

## Configuration Persistence
- **Sticky values (auto-save)**: Persist all form inputs to `localStorage` on every change. Form pre-fills automatically on next visit — zero UI, completely transparent. Covers the "I closed the tab" case.
- **Named presets (explicit save/load)**: "Save as preset" button → user types a name (e.g. "Oak 2¾"", "Walnut 3" wide") → stored in `localStorage` → dropdown at top of form to load any saved preset. Handles users who build multiple standard frame profiles repeatedly. Wood type lives in the preset name, not as a computed field — species doesn't affect any dimension calculation.
- **Shareable URL (bonus)**: Encode all inputs as query params so a config can be bookmarked or shared as a link. Complements sticky + presets with zero storage requirement.

## Workflow
- **Build checklist**: Step-by-step task list (mill stock → route rabbet → cut miters → dry fit → glue → finish → assemble) generated alongside the cut list.
- **Cost estimator**: Estimate lumber cost based on board feet and a user-entered price per BF.
- **Multiple frames in one session**: Calculate dimensions for a batch of frames at once.

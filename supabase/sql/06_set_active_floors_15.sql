-- One-shot helper: deactivate Floors 16-21 so the building visualization
-- shows the 15-floor North Tower elevation. Floors are not deleted — they
-- can be re-activated as the building grows.

update public.locations
set is_active = false
where type = 'floor'
  and sort_order between 16 and 21;

-- Optional: rename the visual building label by adjusting any UI that uses
-- a buildingName prop. See SvgBuildingMap's `buildingName` default.

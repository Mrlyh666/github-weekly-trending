// Append `starsGained` to each current project: current stars minus the same
// repo's stars from the previous snapshot. A repo absent from the previous
// snapshot (first appearance, or a missing prior week) gets null.
export function computeStarsGained(prevProjects, currentProjects) {
  const prev = new Map((prevProjects ?? []).map((p) => [p.repo, p.stars]));
  return currentProjects.map((p) => {
    const cur = p.stars;
    const old = prev.get(p.repo);
    // A gain is only meaningful when both snapshots captured the star count;
    // a failed fetch (null) on either side must not fabricate a number.
    const starsGained =
      prev.has(p.repo) && cur != null && old != null ? cur - old : null;
    return { ...p, starsGained };
  });
}
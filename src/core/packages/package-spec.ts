/**
 * Returns the package name portion of a dependency spec, dropping any version or tag suffix.
 *
 * @param packageSpec - Package specifier like `name@1.2.3` or `@scope/name@latest`.
 * @returns Package name without a trailing version or dist-tag suffix.
 */
export function stripVersionFromPackageSpec(packageSpec: string): string {
  if (packageSpec.startsWith('@')) {
    const secondAt = packageSpec.indexOf('@', 1);
    return secondAt === -1 ? packageSpec : packageSpec.slice(0, secondAt);
  }

  const atIndex = packageSpec.indexOf('@');
  return atIndex === -1 ? packageSpec : packageSpec.slice(0, atIndex);
}

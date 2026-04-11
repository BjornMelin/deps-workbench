import { formatStagedFilesWithBiome } from '../core/exec/format-staged';

const { warnings } = formatStagedFilesWithBiome(process.cwd());

for (const warning of warnings) {
  console.warn(warning);
}

import type { ComponentType } from 'react';
import RondavelRoof from './visuals/RondavelRoof';

export type SceneProps = { onComplete?: () => void };

// key = topic slug. add taxi fare for algebra here later.
export const scenes: Record<string, ComponentType<SceneProps>> = {
  trigonometry: RondavelRoof,
};
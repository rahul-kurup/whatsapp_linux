import { PRELOAD } from '../constants';
import { CustomWAapi } from './common';
import {
  AllPossiblePaths,
  OptionalChainingCombinations,
  Split,
} from './detectPath';

interface WindowShape {
  [PRELOAD.WA_OBJECT]: CustomWAapi;
}

type WindowPaths = AllPossiblePaths<WindowShape>;

export type RendererCode =
  | OptionalChainingCombinations<Split<`window.${WindowPaths}`>>
  | OptionalChainingCombinations<Split<WindowPaths>>;

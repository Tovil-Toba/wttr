import { RecursivePartial, TranslationDictionary } from '../i18n.model';
import { beTranslations } from './be';
import { deTranslations } from './de';
import { enTranslations } from './en';
import { esTranslations } from './es';
import { frTranslations } from './fr';
import { itTranslations } from './it';
import { jaTranslations } from './ja';
import { kkTranslations } from './kk';
import { ptBrTranslations } from './pt-br';
import { ruTranslations } from './ru';
import { trTranslations } from './tr';
import { zhCnTranslations } from './zh-cn';

export const TRANSLATION_MAP: Record<string, RecursivePartial<TranslationDictionary>> = {
  ru: ruTranslations,
  en: enTranslations,
  be: beTranslations,
  de: deTranslations,
  es: esTranslations,
  fr: frTranslations,
  it: itTranslations,
  ja: jaTranslations,
  kk: kkTranslations,
  'pt-br': ptBrTranslations,
  tr: trTranslations,
  'zh-cn': zhCnTranslations,
};

export { ruTranslations, enTranslations };

import { ui, defaultLang, type LanguageKey } from './ui';

export function getLangFromUrl(url: URL): LanguageKey {
  const [, lang] = url.pathname.split('/');
  if (lang && lang in ui) return lang as LanguageKey;
  return defaultLang;
}

export function useTranslations(lang: LanguageKey) {
  return function t(key: keyof (typeof ui)[typeof defaultLang]): string {
    return ui[lang]?.[key] || ui[defaultLang][key] || key;
  };
}

export function getLocalizedPath(lang: LanguageKey, path: string = ''): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  if (lang === defaultLang) {
    return `/${cleanPath}`;
  }
  return `/${lang}/${cleanPath}`;
}

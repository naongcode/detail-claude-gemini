import { NON_PRODUCT_SECTION_KEYWORDS } from './constants'

export function isProductSection(sectionId: string): boolean {
  return !NON_PRODUCT_SECTION_KEYWORDS.some((k) => sectionId.toLowerCase().includes(k))
}

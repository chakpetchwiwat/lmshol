/**
 * Certificate Template Configurations
 * Defines visual styles, metadata, and layout constants for the PDF engine.
 */

const TEMPLATES = {
  CLASSIC: {
    id: 'CLASSIC_001',
    name: 'Classic Elegance',
    description: 'Traditional formal design with decorative borders and gold accents.',
    primaryColor: '#1a3a5a', // Deep Navy
    accentColor: '#d4af37',  // Gold
    fontFamily: 'Sarabun',
    layout: 'classic'
  },
  MODERN: {
    id: 'MODERN_001',
    name: 'Modern Professional',
    description: 'Clean, asymmetrical design with bold typography and vibrant accents.',
    primaryColor: '#1f2937', // Charcoal
    accentColor: '#3b82f6',  // Electric Blue
    fontFamily: 'Sarabun',
    layout: 'modern'
  },
  MINIMAL: {
    id: 'MINIMAL_001',
    name: 'Minimalist Premium',
    description: 'High whitespace and sophisticated typography for a luxury feel.',
    primaryColor: '#4b5563', // Soft Grey
    accentColor: null,
    fontFamily: 'Sarabun',
    layout: 'minimal'
  }
};

const DEFAULT_TEMPLATE_ID = TEMPLATES.CLASSIC.id;

module.exports = {
  TEMPLATES,
  DEFAULT_TEMPLATE_ID,
  getTemplateById: (id) => Object.values(TEMPLATES).find(t => t.id === id) || TEMPLATES.CLASSIC
};

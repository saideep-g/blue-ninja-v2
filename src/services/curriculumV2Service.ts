/**
 * curriculumV2Service.ts
 * 
 * Unified curriculum v2 service that loads and orchestrates all 4 curriculum files.
 */

import manifest from '../data/cbse7_mathquest_manifest_v2.json';
import coreCurriculum from '../data/cbse7_mathquest_core_curriculum_v2.json';
import templateLibrary from '../data/mathquest_template_library_v2.json';
import assessmentGuide from '../data/cbse7_mathquest_assessment_guide_v2.json';

// Type definitions for JSON artifacts
interface Manifest {
  curriculum_bundle_id: string;
  schema_version: string;
  version_lock: any;
  supported_grades: string[];
  supported_syllabi: string[];
  [key: string]: any; // Allow loose matching for mismatched JSON
}

interface Outcome {
  outcome_id: string;
  type: string;
  statement: string;
}

interface Atom {
  atom_id: string;
  title: string;
  moduleId?: string;
  moduleName?: string;
  template_ids?: string[];
  misconception_ids?: string[];
  outcomes?: Outcome[]; // Updated from string[]
  mastery_profile_id?: string;
  [key: string]: any;
}


interface Module {
  module_id: string;
  title: string;
  atoms?: Atom[];
  [key: string]: any;
}

interface CoreCurriculum {
  curriculum_id: string;
  schema_version: string;
  modules: Module[];
}

interface TemplateLibrary {
  schema_version: string;
  templates: Record<string, any>;
}

interface AssessmentGuide {
  schema_version: string;
  mastery_profiles: Record<string, any>;
  sequencing_rules?: any;
  spaced_review_rules?: any;
  analytics_event_specs?: any;
  prompt_recipes?: any;
}

interface UnifiedCurriculum {
  bundleId: string;
  manifestVersion: string;
  versionLock: any;
  gradeLevels: string[];
  syllabus: string[];

  curriculum: CoreCurriculum;
  modules: Module[];
  atoms: Record<string, Atom>;

  templates: Record<string, any>;
  templateIds: string[];

  masteryProfiles: Record<string, any>;
  sequencingRules: any;
  spacedReviewRules: any;
  analyticsSchema: any;
  promptRecipes: any;

  totalModules: number;
  totalAtoms: number;
  supportedTemplates: string[];
}

/**
 * Cached loaded curriculum (loaded once, reused)
 */
let cachedCurriculum: UnifiedCurriculum | null = null;
let cachedMeta: Manifest | null = null;

/**
 * Load all 4 curriculum files and validate versions match
 * Returns unified curriculum object
 */
export const loadCurriculumV2 = async (): Promise<UnifiedCurriculum> => {
  if (cachedCurriculum) return cachedCurriculum;

  try {
    const manifestData = manifest as unknown as Manifest;
    const coreData = coreCurriculum as unknown as CoreCurriculum;
    const templatesData = templateLibrary as unknown as TemplateLibrary;
    const assessmentData = assessmentGuide as unknown as AssessmentGuide; // unknown intermediate if json strictness issues

    console.log('[curriculumV2Service] Manifest loaded:', manifestData.curriculum_bundle_id);

    validateVersionConsistency(manifestData, coreData, templatesData, assessmentData);

    const atomsIndex = indexAtoms(coreData.modules || []);

    const unifiedCurriculum: UnifiedCurriculum = {
      bundleId: manifestData.curriculum_bundle_id,
      manifestVersion: manifestData.schema_version,
      versionLock: manifestData.version_lock,
      gradeLevels: manifestData.supported_grades,
      syllabus: manifestData.supported_syllabi,

      curriculum: coreData,
      modules: coreData.modules || [],
      atoms: atomsIndex,

      templates: templatesData.templates || {},
      templateIds: Object.keys(templatesData.templates || {}),

      masteryProfiles: assessmentData.mastery_profiles || {},
      sequencingRules: assessmentData.sequencing_rules || {},
      spacedReviewRules: assessmentData.spaced_review_rules || {},
      analyticsSchema: assessmentData.analytics_event_specs || {},
      promptRecipes: assessmentData.prompt_recipes || {},

      totalModules: coreData.modules?.length || 0,
      totalAtoms: Object.keys(atomsIndex).length,
      supportedTemplates: Object.keys(templatesData.templates || {}),
    };

    cachedCurriculum = unifiedCurriculum;
    cachedMeta = manifestData;

    console.log('[curriculumV2Service] Unified curriculum ready:', {
      bundle: unifiedCurriculum.bundleId,
      modules: unifiedCurriculum.totalModules,
      atoms: unifiedCurriculum.totalAtoms,
      templates: unifiedCurriculum.templateIds.length,
    });

    return unifiedCurriculum;
  } catch (error) {
    console.error('[curriculumV2Service] Error loading curriculum:', error);
    throw error;
  }
};

function indexAtoms(modules: Module[]): Record<string, Atom> {
  const index: Record<string, Atom> = {};
  modules.forEach(module => {
    (module.atoms || []).forEach(atom => {
      index[atom.atom_id] = {
        ...atom,
        moduleId: module.module_id,
        moduleName: module.title
      };
    });
  });
  return index;
}

function validateVersionConsistency(
  manifest: Manifest,
  core: CoreCurriculum,
  templates: TemplateLibrary,
  assessment: AssessmentGuide
) {
  const issues: string[] = [];

  if (manifest.curriculum_bundle_id !== core.curriculum_id) {
    issues.push(`Curriculum ID mismatch: manifest=${manifest.curriculum_bundle_id}, core=${core.curriculum_id}`);
  }

  const supportedSchemaVersion = '2.0';
  if (core.schema_version !== supportedSchemaVersion) {
    issues.push(`Core schema version ${core.schema_version} not supported (need ${supportedSchemaVersion})`);
  }

  if (templates.schema_version !== supportedSchemaVersion) {
    issues.push(`Template schema version ${templates.schema_version} not supported`);
  }

  if (assessment.schema_version !== supportedSchemaVersion) {
    issues.push(`Assessment schema version ${assessment.schema_version} not supported`);
  }

  if (issues.length > 0) {
    console.warn('[curriculumV2Service] Version consistency issues:', issues);
  }
}

export const getModuleById = async (moduleId: string) => {
  const curriculum = await loadCurriculumV2();
  return curriculum.modules.find(m => m.module_id === moduleId);
};

export const getAtomById = async (atomId: string) => {
  const curriculum = await loadCurriculumV2();
  return curriculum.atoms[atomId] || null;
};

export const getAtomsByModule = async (moduleId: string) => {
  const curriculum = await loadCurriculumV2();
  return Object.values(curriculum.atoms).filter(a => a.moduleId === moduleId);
};

export const getTemplateDefinition = async (templateId: string) => {
  const curriculum = await loadCurriculumV2();
  return curriculum.templates[templateId] || null;
};

export const getMasteryProfile = async (profileId: string) => {
  const curriculum = await loadCurriculumV2();
  return curriculum.masteryProfiles[profileId] || null;
};

export const getAtomsForTemplate = async (templateId: string) => {
  const curriculum = await loadCurriculumV2();
  return Object.values(curriculum.atoms).filter(atom =>
    atom.template_ids?.includes(templateId)
  );
};

export const getMisconceptionsForAtom = async (atomId: string) => {
  const curriculum = await loadCurriculumV2();
  const atom = curriculum.atoms[atomId];
  if (!atom || !atom.misconception_ids) return [];

  return atom.misconception_ids.map(id => ({
    id,
    // Look up full misconception details from assessment guide if available in future
  }));
};

export const getOutcomesForAtom = async (atomId: string) => {
  const curriculum = await loadCurriculumV2();
  const atom = curriculum.atoms[atomId];
  return atom?.outcomes || [];
};

export const getAllAtomsEnriched = async () => {
  const curriculum = await loadCurriculumV2();

  return Object.values(curriculum.atoms).map(atom => ({
    ...atom,
    templates: (atom.template_ids || []).map(id => curriculum.templates[id]),
    misconceptions: atom.misconception_ids || [],
    masteryProfile: atom.mastery_profile_id ?
      curriculum.masteryProfiles[atom.mastery_profile_id] : null,
  }));
};

export const getCurriculumStats = async () => {
  const curriculum = await loadCurriculumV2();

  const templateStats: Record<string, number> = {};
  curriculum.templateIds.forEach(templateId => {
    const atoms = Object.values(curriculum.atoms).filter(a =>
      a.template_ids?.includes(templateId)
    );
    templateStats[templateId] = atoms.length;
  });

  const masteryStats: Record<string, number> = {};
  Object.keys(curriculum.masteryProfiles).forEach(profileId => {
    const atoms = Object.values(curriculum.atoms).filter(a =>
      a.mastery_profile_id === profileId
    );
    masteryStats[profileId] = atoms.length;
  });

  return {
    bundleId: curriculum.bundleId,
    version: curriculum.manifestVersion,
    totalModules: curriculum.totalModules,
    totalAtoms: curriculum.totalAtoms,
    totalTemplates: curriculum.templateIds.length,
    totalMasteryProfiles: Object.keys(curriculum.masteryProfiles).length,
    templateDistribution: templateStats,
    masteryDistribution: masteryStats,
    gradeLevels: curriculum.gradeLevels,
    supportedSyllabi: curriculum.syllabus,
  };
};

export const getCurriculumDebugInfo = async () => {
  const curriculum = await loadCurriculumV2();
  return {
    manifest: cachedMeta,
    curriculumMetadata: {
      id: curriculum.curriculum?.curriculum_id,
      version: curriculum.curriculum?.schema_version,
      modules: curriculum.totalModules,
      atoms: curriculum.totalAtoms,
    },
    templates: {
      count: curriculum.templateIds.length,
      ids: curriculum.templateIds,
    },
    mastery: {
      profiles: Object.keys(curriculum.masteryProfiles),
    },
  };
};

export default {
  loadCurriculumV2,
  getModuleById,
  getAtomById,
  getAtomsByModule,
  getTemplateDefinition,
  getMasteryProfile,
  getAtomsForTemplate,
  getMisconceptionsForAtom,
  getOutcomesForAtom,
  getAllAtomsEnriched,
  getCurriculumStats,
  getCurriculumDebugInfo,
};

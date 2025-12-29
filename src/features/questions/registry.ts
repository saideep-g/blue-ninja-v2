import { QuestionManifest } from './domain';

type ManifestKey = string; // format: "id:version" e.g. "multiple-choice:1"

class QuestionRegistry {
    private manifolds = new Map<ManifestKey, QuestionManifest>();
    private latestVersions = new Map<string, number>();

    register(manifest: QuestionManifest) {
        const key = `${manifest.id}:${manifest.version}`;
        if (this.manifolds.has(key)) {
            console.warn(`Registry: Overwriting existing manifest for ${key}`);
        }

        this.manifolds.set(key, manifest);

        // Update latest version tracking
        const currentLatest = this.latestVersions.get(manifest.id) || 0;
        if (manifest.version > currentLatest) {
            this.latestVersions.set(manifest.id, manifest.version);
        }

        console.log(`✅ Registered Question Type: ${key}`);
    }

    get(id: string, version?: number): QuestionManifest | undefined {
        const targetVersion = version || this.latestVersions.get(id);
        if (!targetVersion) return undefined;

        return this.manifolds.get(`${id}:${targetVersion}`);
    }

    /**
     * Get all registered types for admin dropdowns
     */
    getAllTypes(): { id: string; name: string; latestVersion: number }[] {
        const types = new Set<string>();
        const result: { id: string; name: string; latestVersion: number }[] = [];

        this.manifolds.forEach((manifest) => {
            if (!types.has(manifest.id)) {
                types.add(manifest.id);
                const latestInfo = this.get(manifest.id); // Get latest
                if (latestInfo) {
                    result.push({
                        id: latestInfo.id,
                        name: latestInfo.name,
                        latestVersion: latestInfo.version
                    });
                }
            }
        });

        return result;
    }
}

export const registry = new QuestionRegistry();

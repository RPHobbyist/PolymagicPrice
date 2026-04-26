/*
 * PolymagicPrice
 * Copyright (C) 2025 Rp Hobbyist
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * GitHub API integration for feedback retrieval
 * Users view feedback from GitHub Issues (public, no token needed)
 */

// GitHub Configuration - For fetching public feedback
const GITHUB_CONFIG = {
    owner: 'YOUR_GITHUB_USERNAME',     // e.g., 'rpelectrical06'
    repo: 'YOUR_REPO_NAME',            // e.g., 'printing-price-pro'
};

export interface PublicFeedback {
    id: number;
    name: string;
    rating: number;
    encryptedMessage: string;
    timestamp: string;
    issueUrl: string;
}

// GitHub API response types
interface GitHubLabel {
    name: string;
}

interface GitHubIssue {
    number: number;
    title: string;
    body?: string;
    created_at: string;
    html_url: string;
    labels: GitHubLabel[];
}

/**
 * Fetch all public feedback from GitHub Issues (no token required)
 */
export async function fetchPublicFeedback(): Promise<PublicFeedback[]> {
    try {
        // Fetch issues with 'feedback' label (public API, no auth needed)
        const response = await fetch(
            `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/issues?labels=feedback&state=open&per_page=100`,
            {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                },
            }
        );

        if (!response.ok) {
            console.error('Failed to fetch feedback');
            return [];
        }

        const issues = await response.json() as GitHubIssue[];

        // Parse issues into feedback format
        const feedback: PublicFeedback[] = issues.map((issue: GitHubIssue) => {
            // Extract rating from labels
            const ratingLabel = issue.labels.find((label: GitHubLabel) =>
                label.name.startsWith('rating-')
            );
            const rating = ratingLabel ? parseInt(ratingLabel.name.split('-')[1]) : 0;

            // Extract encrypted message from body
            const encryptedMatch = issue.body?.match(/```\n(.*?)\n```/s);
            const encryptedMessage = encryptedMatch ? encryptedMatch[1].trim() : '';

            // Extract name from title
            const nameMatch = issue.title.match(/from (.+)$/);
            const name = nameMatch ? nameMatch[1] : 'Anonymous';

            return {
                id: issue.number,
                name,
                rating,
                encryptedMessage,
                timestamp: issue.created_at,
                issueUrl: issue.html_url,
            };
        });

        return feedback.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    } catch (error) {
        console.error('Failed to fetch feedback:', error);
        return [];
    }
}

/**
 * Check if public feedback fetching is configured
 */
export function canFetchPublicFeedback(): boolean {
    return (
        GITHUB_CONFIG.owner !== 'YOUR_GITHUB_USERNAME' &&
        GITHUB_CONFIG.repo !== 'YOUR_REPO_NAME'
    );
}

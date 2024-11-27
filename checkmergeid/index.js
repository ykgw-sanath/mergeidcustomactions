const simpleGit = require('simple-git');
const fs = require('fs-extra');
const path = require('path');

// Initialize git
const git = simpleGit();

// Get the source and destination branches from the arguments
const sourceBranch = process.argv[2];  // Source branch (e.g., main)
const destinationBranch = process.argv[3];  // Destination branch (e.g., feature-branch)

// Temporary directory to clone the repo
const tempDir = path.join(__dirname, 'repo');

// Initialize GitHub repository URL
const repoUrl = `https://github.com/${process.env.GITHUB_REPOSITORY}.git`;

// Function to check out branches and compare files
async function compareBranches() {
    try {
        // Step 1: Clone the repository
        console.log(`Cloning repository: ${repoUrl}`);
        await git.clone(repoUrl, tempDir);
        const repoPath = path.join(tempDir);

        // Change the working directory to the cloned repository
        const gitRepo = simpleGit(repoPath);

        // Step 2: Checkout the source and destination branches
        console.log(`Checking out source branch: ${sourceBranch}`);
        await gitRepo.checkout(sourceBranch);
        console.log(`Checking out destination branch: ${destinationBranch}`);
        await gitRepo.checkout(destinationBranch);

        // Step 3: Get the modified files between the two branches
        const modifiedFiles = await getModifiedFiles(gitRepo, sourceBranch, destinationBranch);

        // Step 4: Compare JSON files
        let allowMerge = true;

        for (const file of modifiedFiles) {
            if (file.endsWith('.json')) {
                console.log(`Comparing JSON file: ${file}`);

                const sourceFilePath = path.join(repoPath, file);
                const destFilePath = path.join(repoPath, file);

                // Read and parse the JSON files
                const sourceJson = await fs.readJson(sourceFilePath);
                const destJson = await fs.readJson(destFilePath);

                // Check for link in/out differences in both JSON files
                const sourceLinkInId = getLinkInId(sourceJson);
                const destLinkInId = getLinkInId(destJson);
                const sourceLinkOutId = getLinkOutId(sourceJson);
                const destLinkOutId = getLinkOutId(destJson);

                // If IDs don't match, prevent merging
                if (sourceLinkInId !== destLinkInId || sourceLinkOutId !== destLinkOutId) {
                    console.log(`Difference found in link in/out IDs in file: ${file}. Merge not allowed.`);
                    allowMerge = false;
                    break;
                }
            }
        }

        // Step 5: Output the result (allow or disallow merging)
        if (allowMerge) {
            console.log('Merge allowed.');
            process.exit(0);
        } else {
            console.log('Merge not allowed.');
            process.exit(1);
        }

    } catch (error) {
        console.error('Error during GitHub Action:', error);
        process.exit(1);
    } finally {
        // Clean up: remove the cloned repository directory
        fs.removeSync(tempDir);
    }
}

// Helper function to get modified files between two branches
async function getModifiedFiles(gitRepo, sourceBranch, destinationBranch) {
    const diff = await gitRepo.diff([`${sourceBranch}...${destinationBranch}`, '--name-only']);
    return diff.split('\n').filter(file => file.trim().length > 0);
}

// Helper function to extract the `link in` ID from JSON
function getLinkInId(jsonData) {
    const linkInElement = jsonData.find(item => item.type === 'link in');
    return linkInElement ? linkInElement.id : null;
}

// Helper function to extract the `link out` ID from JSON
function getLinkOutId(jsonData) {
    const linkOutElement = jsonData.find(item => item.type === 'link out');
    return linkOutElement ? linkOutElement.id : null;
}

// Run the comparison function
compareBranches();

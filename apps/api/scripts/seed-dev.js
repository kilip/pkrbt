"use strict";

const fs = require("fs-extra");
const path = require("path");
const mime = require("mime-types");
const _ = require("lodash");
const data = require("./fixtures/data.json");
const { fakerID_ID: faker } = require("@faker-js/faker");
let images = [];
let categories = [];

async function seedData() {
  try {
    console.log("Setting up the template...");
    await importSeedData();
    console.log("Ready to go");
  } catch (error) {
    console.log("Could not import seed data");
    console.error(error);
  }
}

async function setPublicPermissions(newPermissions) {
  // Find the ID of the public role
  const publicRole = await strapi
    .query("plugin::users-permissions.role")
    .findOne({
      where: {
        type: "public",
      },
    });

  // Create the new permissions and link them to the public role
  const allPermissionsToCreate = [];
  Object.keys(newPermissions).map((controller) => {
    const actions = newPermissions[controller];
    const permissionsToCreate = actions.map((action) => {
      return strapi.query("plugin::users-permissions.permission").create({
        data: {
          action: `api::${controller}.${controller}.${action}`,
          role: publicRole.id,
        },
      });
    });
    allPermissionsToCreate.push(...permissionsToCreate);
  });
  await Promise.all(allPermissionsToCreate);
}

function getFileSizeInBytes(filePath) {
  const stats = fs.statSync(filePath);
  const fileSizeInBytes = stats["size"];
  return fileSizeInBytes;
}

function getFileData(fileName) {
  const filePath = path.join("scripts", "fixtures", "img", fileName);
  // Parse the file metadata
  const size = getFileSizeInBytes(filePath);
  const ext = fileName.split(".").pop();
  const mimeType = mime.lookup(ext || "") || "";

  return {
    filepath: filePath,
    originalFileName: fileName,
    size,
    mimetype: mimeType,
  };
}

async function uploadFile(file, name) {
  return strapi
    .plugin("upload")
    .service("upload")
    .upload({
      files: file,
      data: {
        fileInfo: {
          alternativeText: `An image uploaded to Strapi called ${name}`,
          caption: name,
          name,
        },
      },
    });
}

// Create an entry and attach files if there are any
async function createEntry({ model, entry }) {
  try {
    // Actually create the entry in Strapi
    return await strapi.documents(`api::${model}.${model}`).create({
      data: entry,
    });
  } catch (error) {
    if (Object.hasOwn(error, "details")) {
      console.log(error.details);
    } else {
      console.error({ model, entry, error });
    }
  }
}

async function checkFileExistsBeforeUpload(files) {
  const existingFiles = [];
  const uploadedFiles = [];
  const filesCopy = [...files];

  for (const fileName of filesCopy) {
    // Check if the file already exists in Strapi
    const fileWhereName = await strapi.query("plugin::upload.file").findOne({
      where: {
        name: fileName.replace(/\..*$/, ""),
      },
    });

    if (fileWhereName) {
      // File exists, don't upload it
      existingFiles.push(fileWhereName);
    } else {
      // File doesn't exist, upload it
      const fileData = getFileData(fileName);
      const fileNameNoExtension = fileName.split(".").shift();
      const [file] = await uploadFile(fileData, fileNameNoExtension);
      uploadedFiles.push(file);
    }
  }
  const allFiles = [...existingFiles, ...uploadedFiles];
  // If only one file then return only that file
  return allFiles.length === 1 ? allFiles[0] : allFiles;
}

async function importCategories() {
  for (const name of data.categories) {
    const entry = {
      name,
      slug: _.kebabCase(name),
    };
    const entity = await createEntry({ model: "category", entry });
    categories.push(entity);
  }
}

function generateCategory() {
  const rand = faker.number.int({ min: 0, max: categories.length - 1 });
  return {
    id: categories[rand].id,
  };
}

function genTitle() {
  return _.startCase(faker.lorem.words({ min: 2, max: 3 }));
}
/**
 * generates markdown blocks
 */
function generateMarkdown() {
  let contents = [];
  const heading = genTitle();
  contents.push(`# ${heading}`);

  const rand1 = faker.number.int({ min: 1, max: 3 });
  for (let i = 1; i <= rand1; i++) {
    if (i > 1) {
      contents.push(`## ${genTitle()}`);
    }
    const rand2 = faker.number.int({ min: 1, max: 3 });
    for (let j = 1; j <= rand2; j++) {
      contents.push(`${faker.lorem.paragraphs(1)}`);
    }
  }

  return {
    __component: "block.rich-text",
    body: contents.join("\n\n"),
  };
}

/**
 * generates image blocks
 */
function generateImage() {
  const rand = faker.number.int({ min: 0, max: images.length - 1 });
  return {
    __component: "block.image",
    image: images[rand],
  };
}

/**
 * generates slider blocks
 */
function generateSlider() {
  const rand = faker.number.int({ min: 0, max: images.length - 1 });
  let entries = [];
  for (let i = 1; i <= rand; i++) {
    entries.push(images[i]);
  }

  return {
    __component: "block.slider",
    images: entries,
  };
}

async function importArticles() {
  for (let i = 0; i < 50; i++) {
    const title = _.startCase(faker.lorem.words({ min: 2, max: 4 }));
    const description = faker.lorem.sentence();
    const image = generateImage();
    const shareImageUrl = image.image.formats.thumbnail.url;
    const article = {
      title,
      slug: _.kebabCase(title),
      description,
      category: generateCategory(),
      blocks: [
        generateSlider(),
        generateMarkdown(),
        image,
        generateMarkdown(),
        {
          __component: "block.seo",
          metaTitle: title,
          metaDescription: description,
          shareImageUrl,
        },
      ],
    };

    await createEntry({
      model: "article",
      entry: article,
    });
  }
}

async function importImages() {
  // empty dir before uploads
  fs.emptyDirSync("public/uploads");
  fs.ensureFileSync("public/uploads/.gitkeep");

  images = await checkFileExistsBeforeUpload(data.images);
}

async function importOrganization() {
  let organizations = [];

  for (const o of data.organizations) {
    const entry = await createEntry({
      model: "organization",
      entry: {
        name: o.name,
      },
    });
    organizations.push(entry);
  }

  let structures = [];
  for (const s of data.structures) {
    const entry = await createEntry({
      model: "org-structure",
      entry: {
        name: s.name,
        organization: { id: 1 },
      },
    });
    structures.push(entry);
  }

  let positions = [];
  for (const p of data.positions) {
    const item = await createEntry({
      model: "org-position",
      entry: {
        name: p.name,
        structure: { id: 1 },
      },
    });

    positions.push(item);
  }

  for (const m of data.members) {
    const item = await createEntry({
      model: "org-member",
      entry: {
        ...m,
        name: faker.person.fullName(),
      },
    });
  }
}
async function importSeedData() {
  await setPublicPermissions({
    category: ["find", "findOne"],
    static: ["find", "findOne"],
    article: ["find", "findOne"],
  });

  await importOrganization();
  await importCategories();
  await importImages();
  await importArticles();
}

async function cleanupTempDir() {
  const directory = process.cwd() + "/.tmp";
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory);
}

async function createSuperUser() {
  // const password = await strapi.service("admin::auth").hashPassword("admin");
  const superAdminRole = await strapi.service("admin::role").getSuperAdmin();
  const userData = {
    username: "admin",
    password: "admin",
    firstname: "Test",
    lastname: "User",
    email: "test@pkrbt.id",
    blocked: false,
    isActive: true,
    roles: superAdminRole ? [superAdminRole.id] : [],
  };
  const ret = await strapi.service("admin::user").create({
    ...userData,
  });

  console.log(`created user with email: ${ret.email} password: admin`);
}

async function main() {
  await cleanupTempDir();

  const { createStrapi, compileStrapi } = require("@strapi/strapi");

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  app.log.level = "error";

  await createSuperUser();
  await seedData();
  await app.destroy();

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

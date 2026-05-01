/**
 * Update .env with new IGAA tokens and Instagram Account IDs
 */
const fs = require("fs");
const envPath = "/home/ec2-user/galaxia/wa-chatbot/.env";

const newTokens = {
  IG_TOKEN_AMBROSE: "IGAAXTprnk4M1BZAFpsUWx6bGt3bUFsdmdWc1RSNFFyT2ExLTFKNG94ZAHNSQ2ZAubV9sU2tfVnBjRXIwQl9fZAXVSYjRUTGNuOXpoaERWRlFWenN1Nm9scnBzZAW5NQnNQVFdSWHVFOXR6MGE0WU56N3RoXzZA0aThIRWZALVld5blEtVQZDZD",
  IG_TOKEN_AMSTELNEST: "IGAAXTprnk4M1BZAGFqQjR0eHdHWkFteDJXWUI0UlZA3SWVLdEZAaN2VNcnJ5S2xseC1PXzJvSDM4MnF0XzZATdFl0SktHNkZAiaXFkd01UWTRZAQ2otT1JGM1g3Vm51V2prNERQaVo2bXp0a2N2c2RKUW5maWNSWktmRkNaNTg0alZAocwZDZD",
  IG_TOKEN_HEAVENLYVILLA: "IGAAXTprnk4M1BZAGJ6NHhiRXdSMkFCejNobW9jcXcxVFJiTEFaT3FwZAVJTcjhtUGdRMFp2TVhNRW4xVkxLcnRtdzJ1Yk1neV9CYUZADQkk5MWZA5N2pVRWZA2dlRrSUxvaTBycHdBbjlycUNjQUJqRFdMM3ZA5YWhaTXBPMUFVZA24wOAZDZD",
  IG_TOKEN_HILLVIEW: "IGAAXTprnk4M1BZAFpyQmFkLUswdFFTaUtjWEd0UDZASWHNSbFAyelo5SEtYVWdTVWwzcXQ2OUZAPUkpZARThZAc05ab2tNTjNPTFhOaEZARXzB3UDViaVVKeG4zc3lfekg1VWxVMlZApempjTkV0XzIwblVRQVBmQ3BlRjNDR0N3MXQ4OAZDZD",
  IG_TOKEN_LAPARAISO: "IGAAXTprnk4M1BZAGFJZAzlqTDhmRkxqMDVGTWZAZAdDVmNmxZANUdHMzZATemNvTUlCdk9pV1dUanNkU29BQzJTYnVLN0hyUkVUWV9OaWhSaEdybHNlbU16dUw4ZA2ZAkSkh2ZATdOblg0Qkk0UkRDdEFhbzRUSUFXQXdUUm05WEZAPT3JrUQZDZD",
  IG_TOKEN_MOUNTVIEW: "IGAAXTprnk4M1BZAGE5RnJOUGN6ZA1hkdlpNT2kyNmlUaWJ2LWQ2QU16WXU4cjFkSkRGRXlMQ2pyYkVuUFVzcGx3UXFDQ0dZAeThQdUdYdUI3NTNxRjlWRXQtZA29HTXJsbDM1RHVmeGZAfLURqamdXRFFQYjBIM2otaHFiMGhvQmM2NAZDZD",
  IG_ACCOUNT_ID_AMBROSE: "17841459767080062",
  IG_ACCOUNT_ID_AMSTELNEST: "17841478111535297",
  IG_ACCOUNT_ID_HEAVENLYVILLA: "17841462308474348",
  IG_ACCOUNT_ID_HILLVIEW: "17841475657593806",
  IG_ACCOUNT_ID_LAPARAISO: "17841450044732424",
  IG_ACCOUNT_ID_MOUNTVIEW: "17841463465331105",
};

let env = fs.readFileSync(envPath, "utf8");

for (const [key, val] of Object.entries(newTokens)) {
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(env)) {
    env = env.replace(regex, `${key}=${val}`);
    console.log(`Updated ${key}`);
  } else {
    // If it was IG_PAGE_ID but we are adding IG_ACCOUNT_ID, we can just append
    if (key.startsWith("IG_ACCOUNT_ID")) {
      env += `\n${key}=${val}`;
      console.log(`Added ${key}`);
    } else {
      console.log(`NOT FOUND: ${key}`);
    }
  }
}

fs.writeFileSync(envPath, env);
console.log("\nDone updating .env.");

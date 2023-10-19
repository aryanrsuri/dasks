const KV = await Deno.openKv();
import * as hono from "https://deno.land/x/hono@v3.8.1/mod.ts";
const app = new hono.Hono();
interface Task {
  task: string;
  timestamp: string;
  uuid: string;
}

app
  .get("/", async (c) => {
    return await index();
  })
  .get("/tasks", async (c) => {
    const html = await generateTaskList();
    return c.html(html);
  })
  .get("/tasks/delete_all", async (c) => {
    deleteAll();
    return c.text("Ok");
  })
  .post("/tasks", async (c) => {
    const { task } = await c.req.json();
    if (task === "") {
      return new Response("Task is null", {
        "status": 404,
      });
    }
    const uuid = crypto.randomUUID();
    const t: Task = {
      task: task,
      timestamp: new Date().toUTCString(),
      uuid: uuid,
    };
    await KV.set(["tasks", uuid], t);
    const html = await generateTaskList();
    return c.html(html);
  });

const index = async () => {
  let file: Deno.FsFile;
  let stream: ReadableStream<Uint8Array>;
  try {
    file = await Deno.open("./index.html", { read: true });
    stream = file.readable;
  } catch {
    return new Response("NOT FOUND", { status: 404 });
  }

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/html",
    },
  });
};
async function deleteAll() {
  const tasks = KV.list({
    prefix: ["tasks"],
  });

  for await (const task of tasks) {
    KV.delete(["tasks", task.value.uuid]);
  }
}
async function generateTaskList(): Promise<string> {
  const tasks = KV.list({
    prefix: ["tasks"],
  });
  let list = `<div class="flex flex-col w-full">`;
  for await (const task of tasks) {
    console.log(task.value);
    const next =
      `<div class="flex flex-row justify-between items-center border-b border-black text-md " }> 
      <p> ${task.value.task} </p>
      <button type="submit" class="p-2 rounded mr-2 hover:text-red-500" hx-delete="/tasks/${
        task.key[1]
      }" hx-target="#tasks">X</button></div>`;
    list += next;
  }
  list += `</div> `;

  return list;
}

Deno.serve(app.fetch);

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
    const result = await deleteAll();
    if (result == true) {
      return c.text("Ok");
    }
    return c.text("NOT FOUND");
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
  })
  .post("/tasks/:uuid", async (c) => {
    const { task } = await c.req.json();
    const { uuid } = await c.req.param();
    console.log(`uuid of task is : ${uuid}`);
    console.log(task);
    // const { uuid } = c.req.param();
    // const result = await editTask(uuid, task);
  })
  .delete("/tasks/:uuid", async (c) => {
    const { uuid } = c.req.param();
    const result = await deleteTask(uuid);
    if (result === true) {
      const html = await generateTaskList();
      return c.html(html);
    }
    return c.text("NOT FOUND");
  });

const index = async (): Promise<Response> => {
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

async function deleteTask(uuid: string): Promise<boolean> {
  try {
    await KV.delete(["tasks", uuid]);
  } catch {
    return false;
  }
  return true;
}

// async function editTask(uuid: string, task: string): Promise<boolean> {
//   try {
//     await KV.set(["tasks", uuid], task);
//   } catch {
//     return false;
//   }
//   return true;
// }

const deleteAll = async () => {
  const tasks = KV.list({
    prefix: ["tasks"],
  });
  for await (const task of tasks) {
    KV.delete(["tasks", task.value.uuid]);
  }

  return true;
};

async function generateTaskList(): Promise<string> {
  const tasks = KV.list({
    prefix: ["tasks"],
  });
  let list = `<div class="flex flex-col w-full">`;
  for await (const task of tasks) {
    const next = `<div class="flex flex-row items-center text-"> 
      <p id="task-${task.value.uuid}"class="grow"> ${task.value.task} </p>
      <button class="p-2 rounded-none mr-2 font-bold text-green-500" hx-delete="/tasks/${task.value.uuid}" hx-target="#tasks">  <i class="fa fa-check-circle-o hover:text-red-500" aria-hidden="true"></i>  </button></div>`;

    list += next;
  }
  list += `</div> `;
  return list;
}

Deno.serve(app.fetch);

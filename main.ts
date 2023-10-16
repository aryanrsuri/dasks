const KV = await Deno.openKv();
const TASK = "/tasks";

async function handler(req: Request): Promise<Response> {
  const PATHNAME = new URL(req.url).pathname;

  if (PATHNAME === "/" || "") {
    let file;
    try {
      file = await Deno.open("./index.html", { read: true });
    } catch {
      return new Response("NOT FOUND", { status: 404 });
    }
    const stream = file.readable;
    return new Response(stream, {
      status: 200,
      headers: {
        "content-type": "text/html",
      },
    });
  }

  if (PATHNAME === TASK && req.method == "POST") {
    const { task } = await req.json();
    try {
      await KV.set(["task", generateTaskId()], task);
      const tasks = await generateTaskList();
      return new Response(tasks, {
        status: 200,
        headers: {
          "content-type": "text/html",
        },
      });
    } catch {
      return new Response("NOT FOUND", { status: 404 });
    }
    return new Response("");
  }

  if (PATHNAME === TASK && req.method == "GET") {
    try {
      const tasks = await generateTaskList();
      return new Response(tasks, {
        status: 200,
        headers: {
          "content-type": "text/html",
        },
      });
    } catch {
      return new Response("NOT FOUND", { status: 404 });
    }
  }

  if (PATHNAME === TASK && req.method == "DELETE") {
    const { taskId } = await req.json();
    console.log(`${req.method} for ${taskId}`);
    try {
      await KV.delete(["tasks", `${taskId.toString()}`]);
      const tasks = await generateTaskList();
      return new Response(tasks, {
        status: 200,
        headers: {
          "content-type": "text/html",
        },
      });
    } catch (Error) {
      console.error(Error);
      return new Response("NOT FOUND", { status: 404 });
    }
  }
  return new Response("NOT FOUND", { status: 404 });
}

function generateTaskId(): string {
  return `${Date.now()}-${crypto.randomUUID()}`;
}

async function generateTaskList(): Promise<string> {
  const tasks = KV.list({
    prefix: ["task"],
  });

  let list = `<div class="flex flex-col w-full">`;
  for await (const task of tasks) {
    const next =
      `<div class="flex flex-row justify-between items-center border-b border-black text-md " key=${
        task.key[1]
      }> 
      <p> ${task.value} </p>
      <button type="submit"  hx-ext="json-enc"  class="p-2 rounded mr-2 hover:text-red-500" hx-delete="/tasks" hx-target="#tasks">X</button></div>`;
    list += next;
  }
  list += `</div> `;

  return list;
}
Deno.serve({
  port: 8080,
  hostname: "0.0.0.0",
  handler,
});

// const ff = await KV.get(["foo"]);
// console.log(ff);
// await KV.delete(["foo"]);

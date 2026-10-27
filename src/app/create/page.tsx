import { CreatePoll } from "./create-poll";

export default function CreatePollPage() {
  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-4">
      <h1 className="text-2xl font-semibold">Crear encuesta</h1>
      <CreatePoll />
    </div>
  );
}

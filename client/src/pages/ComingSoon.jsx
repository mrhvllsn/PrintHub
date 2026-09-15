import { Construction } from "lucide-react";

import { PageTitle } from "../components/UI";

export default function ComingSoon({ title }) {
  return (
    <>
      <PageTitle
        title={title}
        subtitle={`Manage ${title.toLowerCase()} for PrintHub.`}
      />

      <div className="card grid min-h-72 place-items-center text-center">
        <div>
          <Construction
            className="mx-auto mb-4 text-brand"
            size={42}
          />

          <h2 className="text-xl font-bold">
            {title}
          </h2>

          <p className="mt-2 max-w-md text-slate-500">
            This module is connected to the project
            structure and ready for its database
            workflow. See the README for the included
            API and extension guide.
          </p>
        </div>
      </div>
    </>
  );
}
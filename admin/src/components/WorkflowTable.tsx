import React from "react";
import {
  createTable,
  useTableInstance,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
} from "@tanstack/react-table";
import WorkflowActions from "./WorkflowActions";
import StatusChip from "./StatusChip";
import {
  Autocomplete,
  Box,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
} from "@mui/material";
import { Link } from "react-router-dom";
import {
  getFirstTag,
  getStatus,
  getStatusField,
  WorkflowData,
  WorkflowDataType,
} from "../models/Workflow";
import StyledTableRow from "./StyledTableRow";

type Props = {
  workflows: WorkflowData[];
  group: string;
  refreshFn: () => Promise<void>;
};

const table = createTable()
  .setRowType<WorkflowData>()
  .setFilterMetaType<WorkflowData>()
  .setTableMetaType<{
    group: string;
    refreshFn: () => Promise<void>;
  }>();

const defaultColumns = [
  table.createDataColumn("Name", {
    id: "Workflow",
    header: "Workflow",
    cell: (props) => {
      const data = props.row.original!;
      if (data.Type == WorkflowDataType.Group) {
        const url = `/dags/?group=${encodeURI(data.Group.Name)}`;
        return <Link to={url}>{props.getValue()}</Link>;
      } else {
        const name = data.DAG.File.replace(/.y[a]{0,1}ml$/, "");
        const group = props.instance.options.meta?.group || "";
        const url = `/dags/${encodeURI(name)}?group=${encodeURI(
          group
        )}`;
        return <Link to={url}>{props.getValue()}</Link>;
      }
    },
  }),
  table.createDataColumn("Type", {
    id: "Type",
    header: "Type",
    cell: (props) => {
      const data = props.row.original!;
      if (data.Type == WorkflowDataType.Group) {
        return <Chip color="secondary" size="small" label="Group" />;
      } else {
        return <Chip color="primary" size="small" label="Workflow" />;
      }
    },
    sortingFn: (a, b) => {
      const dataA = a.original;
      const dataB = b.original;
      return dataA!.Type - dataB!.Type;
    },
  }),
  table.createDataColumn("Type", {
    id: "Tags",
    header: "Tags",
    cell: (props) => {
      const data = props.row.original!;
      if (data.Type == WorkflowDataType.Workflow) {
        const tags = data.DAG.Config.Tags;
        return (
          <Stack direction="row" spacing={1}>
            {tags?.map((tag) => (
              <Chip
                key={tag}
                size="small"
                label={tag}
                onClick={() => props.column.setFilterValue(tag)}
              />
            ))}
          </Stack>
        );
      }
      return null;
    },
    filterFn: (props, _, filter) => {
      const data = props.original!;
      if (data.Type != WorkflowDataType.Workflow) {
        return false;
      }
      const tags = data.DAG.Config.Tags;
      const ret = tags?.some((tag) => tag == filter) || false;
      return ret;
    },
    sortingFn: (a, b) => {
      let valA = getFirstTag(a.original);
      let valB = getFirstTag(b.original);
      return valA.localeCompare(valB);
    },
  }),
  table.createDataColumn("Type", {
    id: "Config",
    header: "Description",
    enableSorting: false,
    cell: (props) => {
      const data = props.row.original!;
      if (data.Type == WorkflowDataType.Workflow) {
        return data.DAG.Config.Description;
      }
      return null;
    },
  }),
  table.createDataColumn("Type", {
    id: "Status",
    header: "Status",
    cell: (props) => {
      const data = props.row.original!;
      if (data.Type == WorkflowDataType.Workflow) {
        return (
          <StatusChip status={data.DAG.Status?.Status}>
            {data.DAG.Status?.StatusText || ""}
          </StatusChip>
        );
      }
      return null;
    },
    sortingFn: (a, b) => {
      let valA = getStatus(a.original);
      let valB = getStatus(b.original);
      return valA < valB ? -1 : 1;
    },
  }),
  table.createDataColumn("Type", {
    id: "Started At",
    header: "Started At",
    cell: (props) => {
      const data = props.row.original!;
      if (data.Type == WorkflowDataType.Workflow) {
        return data.DAG.Status?.StartedAt;
      }
      return null;
    },
    sortingFn: (a, b) => {
      const dataA = a.original!;
      const dataB = b.original!;
      let valA = getStatusField("StartedAt", dataA);
      let valB = getStatusField("StartedAt", dataB);
      return valA.localeCompare(valB);
    },
  }),
  table.createDataColumn("Type", {
    id: "Finished At",
    header: "Finished At",
    cell: (props) => {
      const data = props.row.original!;
      if (data.Type == WorkflowDataType.Workflow) {
        return data.DAG.Status?.FinishedAt;
      }
      return null;
    },
    sortingFn: (a, b) => {
      const dataA = a.original!;
      const dataB = b.original!;
      let valA = getStatusField("FinishedAt", dataA);
      let valB = getStatusField("FinishedAt", dataB);
      return valA.localeCompare(valB);
    },
  }),
  table.createDisplayColumn({
    id: "Actions",
    header: "Actions",
    cell: (props) => {
      const data = props.row.original!;
      if (data.Type == WorkflowDataType.Group) {
        return null;
      }
      return (
        <WorkflowActions
          status={data.DAG.Status}
          group={props.instance.options.meta?.group || ""}
          name={data.DAG.Config.Name}
          label={false}
          refresh={props.instance.options.meta?.refreshFn}
        />
      );
    },
  }),
];

function WorkflowTable({ workflows = [], group = "", refreshFn }: Props) {
  const [columns] = React.useState<typeof defaultColumns>(() => [
    ...defaultColumns,
  ]);

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");

  const selectedTag = React.useMemo(() => {
    return (
      (columnFilters.find((filter) => filter.id == "Tags")?.value as string) ||
      ""
    );
  }, [columnFilters]);

  const tagOptions = React.useMemo(() => {
    const map: { [key: string]: boolean } = {};
    workflows.forEach((data) => {
      if (data.Type == WorkflowDataType.Workflow) {
        data.DAG.Config.Tags?.forEach((tag) => {
          map[tag] = true;
        });
      }
    });
    const ret = Object.keys(map).sort();
    return ret;
  }, []);

  const instance = useTableInstance(table, {
    data: workflows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    globalFilterFn: (row, _, globalFilter) => {
      const data = row.original;
      if (!data) {
        return false;
      }
      if (data.Type == WorkflowDataType.Group) {
        return data.Name.toLowerCase().includes(globalFilter);
      }
      const workflow = data.DAG;
      if (workflow.Config.Name.toLowerCase().includes(globalFilter)) {
        return true;
      }
      if (workflow.Config.Description.toLowerCase().includes(globalFilter)) {
        return true;
      }
      const tags = workflow.Config?.Tags;
      if (
        tags &&
        tags.some((tag) => tag.toLowerCase().includes(globalFilter))
      ) {
        return true;
      }
      return false;
    },
    state: {
      sorting,
      globalFilter,
      columnFilters,
    },
    onSortingChange: setSorting,
    meta: {
      group,
      refreshFn,
    },
  });

  return (
    <Box>
      <Stack
        sx={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "start",
          alignContent: "flex-center",
        }}
      >
        <TextField
          label="Search Text"
          size="small"
          InputProps={{
            value: globalFilter || "",
            onChange: (value) => {
              const data = value.target.value;
              setGlobalFilter(data);
            },
            type: "search",
          }}
        />
        <Autocomplete<string>
          size="small"
          limitTags={1}
          value={selectedTag}
          options={tagOptions}
          onChange={(_, value) => {
            instance.getColumn("Tags").setFilterValue(value || "");
          }}
          renderInput={(params) => <TextField {...params} label="Filter Tag" />}
          sx={{ width: "300px", ml: 1 }}
        />
      </Stack>
      <Table size="small">
        <TableHead>
          {instance.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableCell key={header.id} colSpan={header.colSpan}>
                  <Box
                    {...{
                      sx: {
                        cursor: header.column.getCanSort()
                          ? "pointer"
                          : "default",
                      },
                      onClick: header.column.getToggleSortingHandler(),
                    }}
                  >
                    {header.isPlaceholder ? null : header.renderHeader()}
                    {{
                      asc: <TableSortLabel direction="asc" />,
                      desc: <TableSortLabel direction="desc" />,
                    }[header.column.getIsSorted() as string] ?? null}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {instance.getRowModel().rows.map((row) => (
            <StyledTableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{cell.renderCell()}</TableCell>
              ))}
            </StyledTableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
export default WorkflowTable;

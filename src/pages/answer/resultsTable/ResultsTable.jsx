import React, { useMemo } from 'react';
import { useTable, usePagination, useSortBy } from 'react-table';

import Paper from '@mui/material/Paper';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import TableSortLabel from '@mui/material/TableSortLabel';

import ResultExplorer from './ResultExplorer';
import EmptyTable from '~/components/shared/emptyTableRows/EmptyTable';

import './resultsTable.css';

/**
 * Paginated results table
 * @param {object} answerStore - answer store hook
 */
export default function ResultsTable({ answerStore }) {
  const columns = useMemo(() => answerStore.tableHeaders, [answerStore.tableHeaders]);
  const data = useMemo(() => answerStore.message.results, [answerStore.message]);
  const {
    getTableProps, getTableBodyProps,
    headerGroups,
    page, prepareRow,
    state,
    canPreviousPage, canNextPage,
    setPageSize,
    nextPage, previousPage,
  } = useTable(
    {
      columns,
      data,
      initialState: {
        pageIndex: 0,
        pageSize: 10,
        sortBy: [
          {
            id: 'score',
            desc: true,
          },
        ],
      },
    },
    useSortBy,
    usePagination,
  );

  return (
    <>
      <div id="resultsContainer">
        <Paper id="resultsTable" elevation={3}>
          <TableContainer>
            <Table {...getTableProps()}>
              <TableHead>
                {headerGroups.map((headerGroup, i) => (
                  <TableRow key={i} {...headerGroup.getHeaderGroupProps()}>
                    {headerGroup.headers.map((column) => (
                      <TableCell
                        key={column.id}
                        className="resultsTableHeader"
                        {...column.getHeaderProps(column.getSortByToggleProps(
                          {
                            style: {
                              backgroundColor: column.color,
                              cursor: column.canSort ? 'pointer' : '',
                              width: column.width,
                            },
                          },
                        ))}
                      >
                        {column.canSort ? (
                          <TableSortLabel
                            active={column.isSorted}
                            direction={column.isSortedDesc ? 'desc' : 'asc'}
                          >
                            {column.render('Header')}
                          </TableSortLabel>
                        ) : (
                          <>
                            {column.render('Header')}
                          </>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableHead>
              <TableBody style={{ position: 'relative' }} {...getTableBodyProps()}>
                {page.length > 0 ? (
                  <>
                    {page.map((row) => {
                      prepareRow(row);
                      return (
                        <TableRow
                          {...row.getRowProps()}
                          hover
                          selected={answerStore.selectedRowId === row.id}
                          onClick={() => answerStore.selectRow(row.original, row.id)}
                          role="button"
                        >
                          {row.cells.map((cell) => (
                            <TableCell {...cell.getCellProps()}>
                              {cell.render('Cell')}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </>
                ) : (
                  <EmptyTable
                    numRows={10}
                    numCells={columns.length}
                    text="No Results"
                  />
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            rowsPerPageOptions={[5, 10, 15, 50, 100]}
            count={data.length}
            rowsPerPage={state.pageSize}
            page={state.pageIndex}
            backIconButtonProps={{
              onClick: previousPage,
              disabled: !canPreviousPage,
            }}
            nextIconButtonProps={{
              onClick: nextPage,
              disabled: !canNextPage,
            }}
            onChangePage={() => {}} // required prop
            onChangeRowsPerPage={(e) => setPageSize(e.target.value)}
          />
        </Paper>
        <ResultExplorer
          answerStore={answerStore}
        />
      </div>
    </>
  );
}

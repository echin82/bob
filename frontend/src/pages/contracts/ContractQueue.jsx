/**
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Tag } from '@carbon/react';
import {
  StructuredList,
  StructuredListHead,
  StructuredListRow,
  StructuredListCell,
  StructuredListBody,
} from '@carbon/react';

/**
 * Maps a contract status value to a Carbon Tag `type` and display label.
 * Pending contracts have not yet been processed; only "pending" is relevant
 * for this slice — complete/error statuses are handled in the SSE slice.
 */
const STATUS_TAG = {
  pending: { type: 'blue', label: 'Pending' },
  complete: { type: 'green', label: 'Complete' },
  error: { type: 'red', label: 'Error' },
};

const getStatusTag = (status) =>
  STATUS_TAG[status] ?? { type: 'gray', label: status };

/**
 * ContractQueue renders the list of uploaded contracts (TASK-FE-04).
 *
 * - Shows file name, formatted upload timestamp, and processing status (FR-3).
 * - Newest entry appears first — prepended by the parent on each 201 response (R-5).
 * - Renders a placeholder when no contracts have been uploaded.
 * - Does not depend on a database or page reload; state is held in the parent.
 *
 * @param {{ contracts: Array<{ id: string, fileName: string, uploadedAt: string, status: string }> }} props
 */
const ContractQueue = ({ contracts }) => {
  if (!contracts || contracts.length === 0) {
    return (
      <section className="cra--contract-queue" aria-label="Contract queue">
        <h2 className="cra--contract-queue__heading">Contract queue</h2>
        <p className="cra--contract-queue__empty">No contracts uploaded yet.</p>
      </section>
    );
  }

  return (
    <section className="cra--contract-queue" aria-label="Contract queue">
      <h2 className="cra--contract-queue__heading">Contract queue</h2>

      <StructuredList className="cra--contract-queue__list">
        <StructuredListHead>
          <StructuredListRow head>
            <StructuredListCell head>File name</StructuredListCell>
            <StructuredListCell head>Uploaded</StructuredListCell>
            <StructuredListCell head>Status</StructuredListCell>
          </StructuredListRow>
        </StructuredListHead>

        <StructuredListBody>
          {contracts.map((contract) => {
            const { type, label } = getStatusTag(contract.status);
            const formattedDate = new Date(contract.uploadedAt).toLocaleString();

            return (
              <StructuredListRow key={contract.id}>
                <StructuredListCell noWrap={false}>
                  {contract.fileName}
                </StructuredListCell>
                <StructuredListCell noWrap>
                  {formattedDate}
                </StructuredListCell>
                <StructuredListCell noWrap>
                  <Tag type={type} size="sm">
                    {label}
                  </Tag>
                </StructuredListCell>
              </StructuredListRow>
            );
          })}
        </StructuredListBody>
      </StructuredList>
    </section>
  );
};

export { ContractQueue };

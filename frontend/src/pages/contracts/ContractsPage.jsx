/**
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { useState } from 'react';
import { Grid, Column } from '@carbon/react';
import { PageHeader } from '@carbon/ibm-products';

import { PageLayout } from '../../layouts/page-layout';
import { Footer } from '../../components/footer/Footer';
import { ContractUpload } from './ContractUpload';
import { ContractQueue } from './ContractQueue';

// Styles are imported into index.scss — see the comment there.

/**
 * ContractsPage is the single-screen entry point for the contract upload slice.
 *
 * Holds the in-memory queue state and passes:
 *   - onUploadSuccess callback to ContractUpload (prepends new contract to queue)
 *   - contracts array to ContractQueue (renders current queue)
 *
 * Covers: TASK-FE-01 (page shell), TASK-FE-02 + FE-03 (via ContractUpload),
 *         TASK-FE-04 (via ContractQueue).
 */
const ContractsPage = () => {
  // Queue state lives here so ContractUpload and ContractQueue share it.
  // Newest entry is prepended (R-5 — most-recently-uploaded first).
  const [contracts, setContracts] = useState([]);

  const handleUploadSuccess = (contract) => {
    setContracts((prev) => [contract, ...prev]);
  };

  return (
    <PageLayout
      className="cra--contracts"
      fallback={<p>Loading contracts page…</p>}
    >
      <PageHeader title="Contract Risk Assessment" />

      <Grid className="cra--contracts__grid">
        <Column sm={4} md={8} lg={8}>
          <ContractUpload onUploadSuccess={handleUploadSuccess} />
        </Column>

        <Column sm={4} md={8} lg={16}>
          <ContractQueue contracts={contracts} />
        </Column>
      </Grid>

      <Footer />
    </PageLayout>
  );
};

export default ContractsPage;

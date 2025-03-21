import { IInputs, IOutputs } from "./generated/ManifestTypes";
import DataSetInterfaces = ComponentFramework.PropertyHelper.DataSetApi;
type DataSet = ComponentFramework.PropertyTypes.DataSet;

export class dnlbDataSet implements ComponentFramework.StandardControl<IInputs, IOutputs> {

  private _container: HTMLDivElement;
  private _searchInput: HTMLInputElement;
  private _rowCountContainer: HTMLDivElement;
  private _pageSizeSelect: HTMLSelectElement;
  private _paginationContainer: HTMLDivElement;

  private _context: ComponentFramework.Context<IInputs>;
  private _currentPage: number = 1;
  private _pageSize: number = 5;
  private _sortedColumn: string | null = null;
  private _sortOrder: "asc" | "desc" = "asc";

  constructor() { }

  public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement): void {
    this._container = container;
    this._context = context;

    // Search input
    this._searchInput = document.createElement("input");
    this._searchInput.setAttribute("type", "text");
    this._searchInput.setAttribute("placeholder", "Search...");
    this._searchInput.classList.add("search-input");
    this._searchInput.addEventListener("input", () => this.updateTable());
    this._container.appendChild(this._searchInput);

    // Row count display
    this._rowCountContainer = document.createElement("div");
    this._rowCountContainer.classList.add("row-count");
    this._container.appendChild(this._rowCountContainer);

    // Page size dropdown
    this._pageSizeSelect = document.createElement("select");
    this._pageSizeSelect.classList.add("select-dropdown");
    [5, 10, 15, 20].forEach(size => {
      const option = document.createElement("option");
      option.value = size.toString();
      option.textContent = `${size} per page`;
      this._pageSizeSelect.appendChild(option);
    });

    this._pageSizeSelect.value = this._pageSize.toString();
    this._pageSizeSelect.addEventListener("change", () => {
      this._pageSize = parseInt(this._pageSizeSelect.value, 10);
      this._currentPage = 1;
      this.updateTable();
    });

    this._container.appendChild(this._pageSizeSelect);

    // Pagination container
    this._paginationContainer = document.createElement("div");
    this._paginationContainer.classList.add("pagination");

    this._container.appendChild(this._paginationContainer);
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this._context = context;
    this.updateTable();
  }

  private updateTable(): void {
    const searchQuery = this._searchInput.value.toLowerCase();
    let table = this._container.querySelector("table") as HTMLTableElement;
    let tbody = this._container.querySelector("tbody") as HTMLTableSectionElement;
    let thead = this._container.querySelector("thead") as HTMLTableSectionElement;

    if (!table) {
      table = document.createElement("table");
      thead = document.createElement("thead");
      tbody = document.createElement("tbody");

      const trHead = document.createElement("tr");
      this._context.parameters.dotNetLittleBoyDataSet.columns.forEach(columnItem => {
        const th = document.createElement("th");
        th.textContent = columnItem.displayName;
        th.classList.add("sortable");
        th.dataset.column = columnItem.name;

        th.addEventListener("click", () => this.handleSort(columnItem.name, th));

        trHead.appendChild(th);
      });

      thead.appendChild(trHead);
      table.appendChild(thead);
      table.appendChild(tbody);
      this._container.appendChild(table);
    } else {
      tbody.innerHTML = "";
    }

    this.populateTableRows(tbody, searchQuery);
  }

  private handleSort(columnName: string, thElement: HTMLElement): void {
    if (this._sortedColumn === columnName) {
      this._sortOrder = this._sortOrder === "asc" ? "desc" : "asc";
    } else {
      this._sortedColumn = columnName;
      this._sortOrder = "asc";
    }

    // Update UI indicators
    document.querySelectorAll("th.sortable").forEach(th => th.classList.remove("active"));
    thElement.classList.add("active");
    thElement.dataset.order = this._sortOrder;

    this.updateTable();
  }

  private populateTableRows(tbody: HTMLTableSectionElement, searchQuery: string): void {
    const { dotNetLittleBoyDataSet } = this._context.parameters;
    const filteredRecords = dotNetLittleBoyDataSet.sortedRecordIds.filter(recordId =>
      dotNetLittleBoyDataSet.columns.some(columnItem =>
        dotNetLittleBoyDataSet.records[recordId].getFormattedValue(columnItem.name).toLowerCase().includes(searchQuery)
      )
    );

    // Apply sorting
    if (this._sortedColumn) {
      filteredRecords.sort((a, b) => {
        const aValue = dotNetLittleBoyDataSet.records[a].getFormattedValue(this._sortedColumn!) || "";
        const bValue = dotNetLittleBoyDataSet.records[b].getFormattedValue(this._sortedColumn!) || "";

        if (this._sortOrder === "asc") {
          return aValue.localeCompare(bValue, undefined, { numeric: true });
        } else {
          return bValue.localeCompare(aValue, undefined, { numeric: true });
        }
      });
    }

    const totalPages = Math.ceil(filteredRecords.length / this._pageSize);
    const startIdx = (this._currentPage - 1) * this._pageSize;
    const paginatedRecords = filteredRecords.slice(startIdx, startIdx + this._pageSize);

    const fragment = document.createDocumentFragment();

    paginatedRecords.forEach(recordId => {
      const tr = document.createElement("tr");
      this._context.parameters.dotNetLittleBoyDataSet.columns.forEach(columnItem => {
        const td = document.createElement("td");
        td.textContent = this._context.parameters.dotNetLittleBoyDataSet.records[recordId].getFormattedValue(columnItem.name);
        tr.appendChild(td);
      });

      fragment.appendChild(tr);
    });

    tbody.appendChild(fragment);
    this._rowCountContainer.textContent = `Page ${this._currentPage} of ${totalPages}| Showing ${paginatedRecords.length} of ${filteredRecords.length} records`;

    this.updatePaginationControls(totalPages);
  }

  private updatePaginationControls(totalPages: number): void {
    this._paginationContainer.innerHTML = "";

    const createPageButton = (text: string, action: () => void, disabled: boolean) => {
      const button = document.createElement("button");
      button.textContent = text;
      button.classList.add("pagination-button");
      if (disabled) button.classList.add("disabled");
      button.addEventListener("click", action);
      return button;
    };

    // Create navigation buttons
    this._paginationContainer.appendChild(createPageButton("←", () => {
      if (this._currentPage > 1) {
        this._currentPage--;
        this.updateTable();
      }
    }, this._currentPage === 1));

    this._paginationContainer.appendChild(createPageButton("→", () => {
      if (this._currentPage < totalPages) {
        this._currentPage++;
        this.updateTable();
      }
    }, this._currentPage === totalPages));
  }

  public getOutputs(): IOutputs { return {}; }

  public destroy(): void { }
}

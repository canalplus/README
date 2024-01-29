export interface AnchorCheckerErrorItem {
  inputFileWithLink: string;
  inputFileLinkDestination: string;
  anchor: string;
  validity: AnchorValidity;
}

export const enum AnchorValidity {
  Found,
  FileNotFound,
  AnchorNotFound,
}

/**
 * Specialized class here to store then check availability of documentation
 * "anchors" referenced in the various pages.
 * @class AnchorChecker
 */
export default class AnchorChecker {
  private _anchorsPerFile: Map<string, string[]>;
  private _currentQueue: Array<{
    inputFileWithLink: string;
    inputFileLinkDestination: string;
    anchor: string;
  }>;
  constructor() {
    this._anchorsPerFile = new Map();
    this._currentQueue = [];
  }

  public addAnchorsForFile(inputFile: string, anchors: string[]): void {
    this._anchorsPerFile.set(inputFile, anchors);
  }

  public addAnchorReference(
    inputFileWithLink: string,
    inputFileLinkDestination: string,
    anchor: string,
  ): void {
    this._currentQueue.push({
      inputFileWithLink,
      inputFileLinkDestination,
      anchor,
    });
  }

  public check(): AnchorCheckerErrorItem[] {
    const badResults: AnchorCheckerErrorItem[] = [];
    for (const elt of this._currentQueue) {
      const validity = this.checkValidAnchor(
        elt.inputFileLinkDestination,
        elt.anchor,
      );
      if (validity !== AnchorValidity.Found) {
        badResults.push({ ...elt, validity });
      }
    }
    return badResults;
  }

  public checkValidAnchor(file: string, anchor: string): AnchorValidity {
    const anchorsForFile = this._anchorsPerFile.get(file);
    if (anchorsForFile === undefined) {
      return AnchorValidity.FileNotFound;
    }
    if (!anchorsForFile.includes(anchor)) {
      return AnchorValidity.AnchorNotFound;
    }

    return AnchorValidity.Found;
  }

  public getAnchorsForInputFile(inputFile: string): string[] | undefined {
    return this._anchorsPerFile.get(inputFile);
  }
}

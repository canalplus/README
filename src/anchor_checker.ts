/** Item returned by the `AnchorChecker` once it checks anchors. */
export interface AnchorCheckerErrorItem {
  /** The input file which had a link to an anchor. */
  inputFileWithLink: string;
  /**
   * The target input file where the anchor should be found.
   * May be the same than `inputFileWithLink` for local anchors.
   */
  inputFileLinkDestination: string;
  /** The actual anchor. */
  anchor: string;
  /** The result of the validity check for that anchor. */
  validity: AnchorValidity;
}

/** Result of an anchor's validity check performed by the `AnchorChecker`. */
export const enum AnchorValidity {
  /** The anchor has been found in the corresponding file. */
  Found,
  /** The target input file was not found. */
  FileNotFound,
  /** The anchor has not been found in the corresponding file. */
  AnchorNotFound,
}

/**
 * Specialized class here to store then check availability of documentation
 * "anchors" referenced in the various pages.
 * @class AnchorChecker
 */
export default class AnchorChecker {
  /**
   * Map linking input files to all anchors generated for that file (e.g. for
   * headers).
   * This Map is updated by `addAnchorsForFile`.j ks
   */
  private _anchorsPerFile: Map<string, string[]>;
  /** Current list of anchors seen in the various files. */
  private _anchorsList: Array<{
    /** In which file that anchor was seen. */
    inputFileWithLink: string;
    /** In which of the input files the anchor should be found in. */
    inputFileLinkDestination: string;
    /** Its anchor. */
    anchor: string;
  }>;

  constructor() {
    this._anchorsPerFile = new Map();
    this._anchorsList = [];
  }

  /**
   * Add a list of anchors set in a particular input file.
   * @param {string} inputFile - The Markdown file from which the anchors are.
   * @param {Array.<string>} anchors - Every anchors in that file.
   */
  public addAnchorsForFile(inputFile: string, anchors: string[]): void {
    this._anchorsPerFile.set(inputFile, anchors);
  }

  /**
   * Adds a reference to an anchor seen in an input file.
   *
   * This method doesn't check the validity of that anchor yet, it just adds
   * it to the `AnchorChecker`'s local queue of referenced anchors which can
   * then be checked all at once by calling `checkAllAnchors`.
   * @param {string} inputFileWithLink - The input file where the anchored link
   * was found.
   * @param {string} inputFileLinkDestination - The targeted input file where
   * the anchor should be found.
   * @param {string} anchor - The actual anchor.
   */
  public addAnchorReference(
    inputFileWithLink: string,
    inputFileLinkDestination: string,
    anchor: string
  ): void {
    this._anchorsList.push({
      inputFileWithLink,
      inputFileLinkDestination,
      anchor,
    });
  }

  /**
   * Check the validity of all anchors added through `addAnchorReference`
   * method calls and return descriptions of checks which failed.
   * @returns {Array.<Object>} - Description of every anchor check that
   * failed, or an empty array if all anchors are valid.
   */
  public checkAllAnchors(): AnchorCheckerErrorItem[] {
    const badResults: AnchorCheckerErrorItem[] = [];
    for (const elt of this._anchorsList) {
      const validity = this.checkValidAnchor(
        elt.inputFileLinkDestination,
        elt.anchor
      );
      if (validity !== AnchorValidity.Found) {
        badResults.push({ ...elt, validity });
      }
    }
    return badResults;
  }

  /**
   * Check the validity of a single anchor according to what has been
   * communicated previously to the `AnchorChecker`.
   * @param {string} file - The input file which that anchor applies to.
   * @param {string} anchor - The actual anchor
   * @returns {number} - Number describing that anchor's validity.
   */
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

  /**
   * Returns all anchors available in an input file according to what has been
   * communicated previously to the `AnchorChecker`.
   *
   * Returns `undefined` if the input file was never added to the
   * `AnchorChecker`.
   * @returns {Array.<string>|undefined}
   */
  public getAnchorsForInputFile(inputFile: string): string[] | undefined {
    return this._anchorsPerFile.get(inputFile);
  }
}

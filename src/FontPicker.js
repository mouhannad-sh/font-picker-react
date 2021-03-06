import React, { Component } from 'react';
import { FontManager } from 'font-picker';


/**
 * React interface for the font picker
 * @prop {string} apiKey (required) - Google API key
 * @prop {string} activeFont - Font that should be selected in the font picker and applied to the
 * text (default: 'Open Sans'). Must be stored in component state, and be updated using an onChange
 * listener. See README.md for an example.
 * @prop {Object} options - Object with additional (optional) parameters:
 *   @prop {string} name - If you have multiple font pickers on your site, you need to give them
 *   unique names (which may only consist of letters and digits). These names must also be appended
 *   to the font picker's ID and the .apply-font class name.
 *   Example: If { name: 'main' }, use #font-picker-main and .apply-font-main
 *   @prop {string[]} families - If only specific fonts shall appear in the list, specify their
 *   names in an array
 *   @prop {string[]} categories - Array of font categories
 *   Possible values: 'sans-serif', 'serif', 'display', 'handwriting', 'monospace' (default: all
 *   categories)
 *   @prop {string[]} variants - Array of variants which the fonts must include and which will be
 *   downloaded; the first variant in the array will become the default variant (and will be used
 *   in the font picker and the .apply-font class)
 *   Example: ['regular', 'italic', '700', '700italic'] (default: ['regular'])
 *   @prop {number} limit - Maximum number of fonts to be displayed in the list (the least popular
 *   fonts will be omitted; default: 100)
 *   @prop {string} sort - Sorting attribute for the font list
 *   Possible values: 'alphabetical' (default), 'popularity'
 *   @prop {Boolean} cleanStylesOnUnmount - Remove generated style tags that apply the font previews
 *   on selected targets
 * @prop {function} onChange - Function which is executed whenever the user changes the active font
 * and its stylesheet finishes downloading
 */
export default class FontPicker extends Component {
	constructor(props) {
		super(props);

		this.state = {
			activeFont: this.props.activeFont,
			errorText: '',
			expanded: false,
			loadingStatus: 'loading' // possible values: 'loading', 'finished', 'error'
		};

		// initialize FontManager object and generate the font list
		this.fontManager = new FontManager(
			this.props.apiKey,
			this.props.activeFont,
			this.props.options
		);
		this.fontManager.init()
			.then(() => {
				// font list has finished loading
				this.setState({
					errorText: '',
					loadingStatus: 'finished'
				});
			})
			.catch((err) => {
				// error while loading font list
				this.setState({
					errorText: 'Error trying to fetch the list of available fonts',
					loadingStatus: 'error'
				});
				console.error(this.state.errorText);
				console.error(err);
			});

		// function bindings
		this.setActiveFont = this.setActiveFont.bind(this);
		this.onClose = this.onClose.bind(this);
		this.onScroll = this.onScroll.bind(this);
		this.toggleExpanded = this.toggleExpanded.bind(this);
	}

	/**
	 * After every component update, check whether the activeFont prop has changed. If so, change the
	 * font in the fontManager as well
	 */
	componentDidUpdate() {
		if (this.state.activeFont !== this.props.activeFont) {
			this.setActiveFont(this.props.activeFont);
		}
	}
	/**
	 * Before the component unmount, remove the Style tag generated by frontManager instance
	 */
	componentWillUnmount() {
		if (this.props.cleanStylesOnUnmount) {
			this.fontManager.removeCustomStyle();
		}
	}

	/**
	 * EventListener for closing the font picker when clicking anywhere outside it
	 */
	onClose(e) {
		let targetElement = e.target; // clicked element

		do {
			if (targetElement === document.getElementById('font-picker')) {
				// click inside font picker
				return;
			}
			// move up the DOM
			targetElement = targetElement.parentNode;
		} while (targetElement);

		// click outside font picker
		this.toggleExpanded();
	}

	/**
	 * Download the font previews for all visible font entries and the five after them
	 */
	onScroll(e) {
		const elementHeight = e.target.scrollHeight / this.fontManager.fonts.length;
		const downloadIndex = Math.ceil((e.target.scrollTop + e.target.clientHeight) / elementHeight);
		this.fontManager.downloadPreviews(downloadIndex + 5);
	}

	/**
	 * Set the font with the given font list index as the active one
	 */
	setActiveFont(fontFamily) {
		const activeFontIndex = this.fontManager.setActiveFont(fontFamily);
		if (activeFontIndex === -1) {
			// error trying to change font
			this.setState({
				activeFont: fontFamily,
				errorText: `Cannot update activeFont: The font "${fontFamily}" is not in the font list`,
				loadingStatus: 'error'
			});
			console.error(this.state.errorText);
		} else {
			// font change successful
			this.setState({
				activeFont: fontFamily,
				errorText: '',
				loadingStatus: 'finished'
			});
		}
	}

	/**
	 * Expand/collapse the picker's font list
	 */
	toggleExpanded() {
		if (this.state.expanded) {
			this.setState({
				expanded: false
			});
			document.removeEventListener('click', this.onClose);
		} else {
			this.setState({
				expanded: true
			});
			document.addEventListener('click', this.onClose);
		}
	}

	render() {
		// generate <ul> with font list; fetch font previews on scroll
		let fontList;
		if (this.state.loadingStatus === 'finished') {
			fontList = (
				<ul className={this.state.expanded ? 'expanded' : ''} onScroll={this.onScroll}>
					{
						this.fontManager.fonts.map((font) => {
							const isActive = font.family === this.state.activeFont;
							const fontId = font.family.replace(/\s+/g, '-').toLowerCase();
							return (
								<li key={font.family}>
									<button
										type="button"
										className={`font-${fontId} ${isActive ? 'active-font' : ''}`}
										onClick={() => {
											this.toggleExpanded();
											this.props.onChange(font);
										}}
										onKeyPress={() => {
											this.toggleExpanded();
											this.props.onChange(font);
										}}
									>
										{font.family}
									</button>
								</li>
							);
						})
					}
				</ul>
			);
		}

		// render font picker button and attach font list to it
		return (
			<div id={`font-picker${this.fontManager.options.name}`} title={this.state.errorText}>
				<button
					type="button"
					className={`dropdown-button ${this.state.expanded ? 'expanded' : ''}`}
					onClick={this.toggleExpanded}
					onKeyPress={this.toggleExpanded}
				>
					<p className="dropdown-font-name">{this.state.activeFont}</p>
					<div className={`dropdown-icon ${this.state.loadingStatus}`} />
				</button>
				{this.state.loadingStatus === 'finished' && fontList}
			</div>
		);
	}
}

<?php
/**
 * DokuWiki Plugin advrack (Syntax Component)
 *
 * @license GPL 2 http://www.gnu.org/licenses/gpl-2.0.html
 * @author  Ashraf Hasson <ashraf.hasson@gmail.com>
 */

// must be run within Dokuwiki
if(!defined('DOKU_INC')) die();
//if(!defined('DOKU_INC')) define('DOKU_INC',realpath(dirname(__FILE__).'/../../').'/');
if(!defined('DOKU_PLUGIN')) define('DOKU_PLUGIN',DOKU_INC.'lib/plugins/');
//require_once(DOKU_PLUGIN.'syntax.php');

class syntax_plugin_advrack extends DokuWiki_Syntax_Plugin {
    /**
     * @return string Syntax mode type
     */
    public function getType() { return "protected"; }
    /**
     * @return string Paragraph type
     */
    //public function getPType() {
    //    return 'normal';
    //}
    /**
     * @return int Sort order - Low numbers go before high numbers
     */
    public function getSort() { return 999; }
    /**
     * Connect lookup pattern to lexer.
     *
     * @param string $mode Parser mode
     */
    public function connectTo($mode) { $this->Lexer->addEntryPattern('<advrack>(?=.*?</advrack>)',$mode,'plugin_advrack'); }

    public function postConnect() { $this->Lexer->addExitPattern('</advrack>','plugin_advrack'); }

    /**
     * Handle matches of the advrack syntax
     *
     * @param string $match The match of the syntax
     * @param int    $state The state of the handler
     * @param int    $pos The position in the document
     * @param Doku_Handler    $handler The handler
     * @return array Data for the renderer
     */
    public function handle($match, $state, $pos, Doku_Handler &$handler){
	switch ($state) {
	        case DOKU_LEXER_ENTER : return array($state, array($state, $match));
	        case DOKU_LEXER_UNMATCHED : return array($state, $match);
	        case DOKU_LEXER_EXIT : return array($state, '');
	}
        return array();
    }

    /**
     * Render xhtml output or metadata
     *
     * @param string         $mode      Renderer mode (supported modes: xhtml)
     * @param Doku_Renderer  $renderer  The renderer
     * @param array          $data      The data from the handler() function
     * @return bool If rendering was successful.
     */
    public function render($mode, Doku_Renderer &$renderer, $data) {
        if($mode == 'xhtml') {
		list($state,$match) = $data;
		switch ($state) {
			//case DOKU_LEXER_ENTER:$renderer->doc .= "<pre advrack='true' style='border: none; box-shadow: none;background-color: #fff;'>"; break;
			case DOKU_LEXER_ENTER:$renderer->doc .= "<div class=\"advrack mediacenter\">"; break;
			//case DOKU_LEXER_UNMATCHED: $renderer->doc .= $match; error_log("UNMATCHED: $match"); break;
			case DOKU_LEXER_UNMATCHED: $renderer->doc .= $renderer->_xmlEntities($match); break;
			case DOKU_LEXER_EXIT:$renderer->doc .= "</div>"; break;
		}
		return true;
	}
	return false;
    }
}

// vim:ts=4:sw=4:et:

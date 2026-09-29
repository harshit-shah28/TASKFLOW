"""
DSA Module 2: Trie (Prefix Tree)
Enables O(k) prefix search and autocomplete across tasks, projects, tags, and team members.
"""
from typing import Dict, List, Optional


class TrieNode:
    def __init__(self):
        self.children: Dict[str, 'TrieNode'] = {}
        self.is_terminal: bool = False
        # Store entity references associated with this exact prefix/word
        self.items: List[dict] = []


class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, phrase: str, item_data: dict) -> None:
        """
        Inserts words from a phrase into the Trie.
        Splits title into individual tokens so searching any word in the title finds the item.
        """
        if not phrase:
            return
            
        clean_phrase = phrase.strip().lower()
        # Index full phrase and sub-tokens
        words = clean_phrase.split()
        tokens = [clean_phrase] + words

        for token in tokens:
            node = self.root
            for char in token:
                if char not in node.children:
                    node.children[char] = TrieNode()
                node = node.children[char]
            node.is_terminal = True
            
            # Avoid duplicate items on same terminal node
            if not any(it.get('id') == item_data.get('id') and it.get('type') == item_data.get('type') for it in node.items):
                node.items.append(item_data)

    def search_prefix(self, prefix: str, limit: int = 15) -> List[dict]:
        """
        Finds all items starting with the given prefix.
        Complexity: O(p + m) where p is len(prefix) and m is number of descendant nodes.
        """
        if not prefix:
            return []
            
        prefix = prefix.strip().lower()
        node = self.root
        for char in prefix:
            if char not in node.children:
                return []
            node = node.children[char]

        # Gather all items under this subtree via DFS
        results: List[dict] = []
        seen_keys = set()

        def _dfs(curr: TrieNode):
            nonlocal results
            if len(results) >= limit:
                return
            if curr.is_terminal:
                for item in curr.items:
                    key = (item.get('type'), item.get('id'))
                    if key not in seen_keys:
                        seen_keys.add(key)
                        results.append(item)
                        if len(results) >= limit:
                            return
            for child in curr.children.values():
                _dfs(child)
                if len(results) >= limit:
                    return

        _dfs(node)
        return results

    def clear(self) -> None:
        """Reset the Trie."""
        self.root = TrieNode()

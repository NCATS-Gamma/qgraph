import { useState, useEffect, useCallback } from 'react';
import _ from 'lodash';
import strings from '~/utils/strings';
import getNodeCategoryColorMap from '~/utils/colors';

const baseClass = 'biolink:NamedThing';

const newClassNode = (name) => ({
  name,
  uuid: crypto.randomUUID(),
  parent: null,
  children: [],
  mixinParents: [],
  mixinChildren: [],
  abstract: false,
  mixin: false,
});

const newSlotNode = (name) => ({
  name,
  uuid: crypto.randomUUID(),
  parent: null,
  children: [],
  mixinParents: [],
  mixinChildren: [],
  abstract: false,
  mixin: false,
});

export default function useBiolinkModel() {
  const [biolinkModel, setBiolinkModel] = useState(null);
  const [concepts, setConcepts] = useState([]);
  const [hierarchies, setHierarchies] = useState({});
  const [predicates, setPredicates] = useState([]);
  const [ancestorsMap, setAncestorsMap] = useState([]);
  const colorMap = useCallback(getNodeCategoryColorMap(hierarchies), [hierarchies]);

  const [model, setModel] = useState(null);

  function checkIfDescendantOfRelatedTo([name, slot]) {
    let currentName = name;
    let current = slot;
    while (current.is_a) {
      currentName = current.is_a;
      current = biolinkModel.slots[current.is_a];
    }
    return currentName === 'related to';
  }

  /**
   * Get a list of all predicates in the biolink model
   * @returns {object[]} list of predicate objects
   */
  function getEdgePredicates() {
    const newPredicates = Object.entries(biolinkModel.slots).filter(checkIfDescendantOfRelatedTo);
    // hard code in treats + parent, they're techincally not descendants of `related to`
    // TODO: we'll want the more correct parsing using mixins at some point
    newPredicates.push(['treats', biolinkModel.slots.treats]);
    newPredicates.push(['treats or applied or studied to treat', biolinkModel.slots['treats or applied or studied to treat']]);
    return newPredicates.map(([identifier, predicate]) => ({
      predicate: strings.edgeFromBiolink(identifier),
      domain: strings.nodeFromBiolink(predicate.domain),
      range: strings.nodeFromBiolink(predicate.range),
    }));
  }

  /**
   * Given a biolink class name, return an array of all mixin
   * classes (and their ancestors)
   *
   * @param {string} className - a biolink class
   * @param {object} classes - object of all biolink classes
   * @returns {string[]}
   */
  function collectMixins(className, classes) {
    const collected = [];
    if (classes[className] && classes[className].mixins && Array.isArray(classes[className].mixins)) {
      for (let i = 0; i < classes[className].mixins.length; i += 1) {
        const mixin = classes[className].mixins[i];
        collected.push(mixin);
        if (classes[mixin].is_a) {
          collectMixins(classes[mixin].is_a, classes);
        }
      }
    }
    return collected;
  }

  /**
   * Given a biolink class, build a list of parent classes
   * Ex: Given 'gene' as an input this function will return:
   *
   * [ "gene", "gene_or_gene_product", "macromolecular_machine",
   *   "genomic_entity", "molecular_entity", "biological_entity",
   *   "named_thing" ]
   *
   * @param {string} className - a biolink class
   * @param {object} biolinkClasses - object of all biolink classes
   * @returns {string[]} list of related biolink classes
   */
  function getAncestors(childClass, classes) {
    let currentClass = childClass;
    const ancestors = [];
    // Repeat until we hit the top of the classes
    while (
      classes[currentClass] &&
      classes[currentClass].is_a
    ) {
      // reassign current type to parent type
      currentClass = classes[currentClass].is_a;
      ancestors.push(currentClass, ...collectMixins(currentClass, classes));
    }
    return ancestors;
  }

  /**
   * Get all descendants by getting direct descendants recursively
   * @param {string} parentClass - biolink class to get direct descendants of
   * @param {object} classes - object of all biolink classes
   * @returns {string[]} list of all descendants
   */
  function getDescendants(parentClass, classes) {
    let descendants = [];
    Object.keys(classes).forEach((key) => {
      if (classes[key].is_a === parentClass) {
        descendants.push(key);

        if (classes[key].mixins && Array.isArray(classes[key].mixins)) {
          for (let i = 0; i < classes[key].mixins.length; i += 1) {
            const mixin = classes[key].mixins[i];
            descendants.push(mixin);
            if (classes[mixin].is_a) {
              collectMixins(classes[mixin].is_a, classes);
            }
          }
        }

        // Repeat until we hit the bottom of the classes
        descendants = descendants.concat(getDescendants(key, classes));
      }
    });
    return descendants;
  }

  /**
   * Get a list of hierarchies for all biolink classes
   * @param {object} biolinkClasses - object of all biolink classes
   * @returns {object} Object with classes as keys and hierarchy lists as values
   */
  function getAllHierarchies(biolinkClasses) {
    const newHierarchies = Object.keys(biolinkClasses).reduce((obj, item) => {
      let ancestors = getAncestors(item, biolinkClasses);
      ancestors = ancestors.map((h) => strings.nodeFromBiolink(h));
      let descendants = getDescendants(item, biolinkClasses);
      descendants = descendants.map((h) => strings.nodeFromBiolink(h));
      const thisClassAndMixins = [item, ...collectMixins(item, biolinkClasses)].map((h) => strings.nodeFromBiolink(h));
      obj[strings.nodeFromBiolink(item)] = [...descendants, ...thisClassAndMixins, ...ancestors];
      return obj;
    }, {});
    return newHierarchies;
  }

  /**
   * Get a list of ancestors for all biolink classes
   * @param {object} biolinkClasses - object of all biolink classes
   * @returns {object} Object with classes as keys and ancestor lists as values
   */
  function getAllAncestors(biolinkClasses) {
    const newAncestors = Object.keys(biolinkClasses).reduce((obj, item) => {
      let ancestors = getAncestors(item, biolinkClasses);
      ancestors = ancestors.map((h) => strings.nodeFromBiolink(h));
      const thisClassAndMixins = [item, ...collectMixins(item, biolinkClasses)].map((h) => strings.nodeFromBiolink(h));
      obj[strings.nodeFromBiolink(item)] = [...thisClassAndMixins, ...ancestors];
      return obj;
    }, {});
    return newAncestors;
  }

  /**
   * Filter out concepts that are not derived classes of base class
   * @param {object} allHierarchies - object of all hierarchy lists
   * @returns {array} list of valid concepts
   */
  function getValidConcepts(allHierarchies) {
    const newConcepts = Object.keys(allHierarchies).filter((biolinkClass) => allHierarchies[biolinkClass].includes(baseClass));
    return newConcepts;
  }

  useEffect(() => {
    if (biolinkModel) {
      const biolinkClasses = _.transform(biolinkModel.classes,
        (result, value, key) => { result[key] = value; });
      const allHierarchies = getAllHierarchies(biolinkClasses);
      const allConcepts = getValidConcepts(allHierarchies);
      const allPredicates = getEdgePredicates();
      const allAncestors = getAllAncestors(biolinkClasses);
      setHierarchies(allHierarchies);
      setConcepts(allConcepts);
      setPredicates(allPredicates);
      setAncestorsMap(allAncestors);

      const slotRootItems = [];
      const slotLookup = new Map();
      for (const [name, slot] of Object.entries(biolinkModel.slots)) {
        if (!slotLookup.has(name)) {
          slotLookup.set(name, newSlotNode(name));
        }

        const thisNode = slotLookup.get(name);

        const parentName = slot.is_a ?? null;
        if (!parentName) {
          slotRootItems.push(thisNode);
        } else {
          if (!slotLookup.has(parentName)) {
            slotLookup.set(parentName, newSlotNode(parentName));
          }

          const parentNode = slotLookup.get(parentName);
          parentNode.children.push(thisNode);
          thisNode.parent = parentNode;
        }

        thisNode.abstract = slot.abstract ?? false;
        thisNode.mixin = slot.mixin ?? false;

        // this node has mixins parents
        const mixinNames = slot.mixins ?? null;
        if (mixinNames) {
          for (const mixinName of mixinNames) {
            if (!slotLookup.has(mixinName)) {
              slotLookup.set(mixinName, newSlotNode(mixinName));
            }

            const mixinNode = slotLookup.get(mixinName);
            mixinNode.mixinChildren.push(thisNode);
            thisNode.mixinParents.push(mixinNode);
          }
        }
      }

      const rootItems = [];
      const lookup = new Map();
      for (const [name, cls] of Object.entries(biolinkModel.classes)) {
        if (!lookup.has(name)) {
          lookup.set(name, newClassNode(name));
        }

        const thisNode = lookup.get(name);

        const parentName = cls.is_a ?? null;
        if (!parentName) {
          rootItems.push(thisNode);
        } else {
          if (!lookup.has(parentName)) {
            lookup.set(parentName, newClassNode(parentName));
          }

          const parentNode = lookup.get(parentName);
          parentNode.children.push(thisNode);
          thisNode.parent = parentNode;
        }

        thisNode.abstract = cls.abstract ?? false;
        thisNode.mixin = cls.mixin ?? false;

        if (cls.slot_usage) {
          thisNode.slotUsage = cls.slot_usage;

          thisNode.slotUsage.subject = cls.slot_usage.subject?.range
            ? lookup.get(cls.slot_usage.subject?.range)
            : undefined;

          thisNode.slotUsage.object = cls.slot_usage.object?.range
            ? lookup.get(cls.slot_usage.object?.range)
            : undefined;

          thisNode.slotUsage.predicate = cls.slot_usage.predicate
            ?.subproperty_of
            ? slotLookup.get(cls.slot_usage.predicate?.subproperty_of)
            : undefined;
        }

        // this node has mixins parents
        const mixinNames = cls.mixins ?? null;
        if (mixinNames) {
          for (const mixinName of mixinNames) {
            if (!lookup.has(mixinName)) {
              lookup.set(mixinName, newClassNode(mixinName));
            }

            const mixinNode = lookup.get(mixinName);
            mixinNode.mixinChildren.push(thisNode);
            thisNode.mixinParents.push(mixinNode);
          }
        }
      }

      setModel({
        classes: {
          treeRootNodes: rootItems,
          lookup,
        },
        slots: {
          treeRootNodes: slotRootItems,
          lookup: slotLookup,
        },
        associations: lookup.get("association"),
        qualifiers: slotLookup.get("qualifier"),
        enums: biolinkModel.enums,
      });
    }
  }, [biolinkModel]);

  return {
    setBiolinkModel,
    model,
    concepts,
    hierarchies,
    predicates,
    ancestorsMap,
    colorMap,
  };
}

exports.Flatten = function Flatten(tree, index) {
    index = index || 0;
    var result = [];
    var currNode = {
        name: tree.name,
        valueType: tree.valueType,
        value: tree.value,
        children: []
    };
    result.push(currNode);
    index++;
    for (var child of tree.children || []) {
        currNode.children.push(index);
        var flatChild = Flatten(child, index);
        result = result.concat(flatChild);
        index += flatChild.length;
    }
    return result;
};

exports.Unflatten = function Unflatten(list, index) {
    index = index || 0;
    var node = {};
    if (!list[index]) {
        return {};
    }
    node.name = list[index].name;
    node.valueType = list[index].valueType;
    node.value = list[index].value;
    node.index = index;
    node.children = [];
    for (var childIndex of (list[index].children || []))  {
        node.children.push(Unflatten(list, childIndex));
    }
    return node;
};

var _toJson = (tree) => {
    switch (tree.valueType) {
        case 'object': {
            var result = {};
            for (var child of tree.children) {
                result[child.name] = _toJson(child);
            }
            return result;
        }
        case 'array': {
            var result = [];
            for (var child of tree.children) {
                result.push(_toJson(child));
            }
            return result;
        }
        default:
            return tree.value;
    }
};

exports.toJson = (list) => {
    var tree = Unflatten(list);
    return _toJson(tree);
}
var upload_action = reqContextPath + '/user/home/file/upload';
var progressbarNum = 1;
var moveToDestDirId = 0;
var prev = 1;
var next = 1;
var deleting = false;
var creatingShare = false;
var creatingNewDir = false;
var movingDirs = false;
var renamingDir = false;
var renamingTag = false;
var gettingDir = false;
var creatingOffline = false;
var gettingOfflineList = false;
var gettingList = false;
var cancellingOffline = false;
var clickedCancelOfflineBtn = null;
var uploadWithMD5Check = true;
var checkingMD5 = false;
var uploadingFilesCount = 0;
var readyList = new HashMap();
var errorList = new HashMap();
var pieceFileUploadList = new HashMap();
var maxUploadingFiles = 2;
var uploadWithPiece = false;
var pieceSize = 5242880; //5M
var uploadingPieceCount = 0;
var maxUploadingPiece = 8;
var blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
var pieceMaxErrorToCancel = 33;
var pieceUploadTimeout = 120 * 1000;
var resetPieceErrorCountInterval = 180 * 1000;
var creatingDirInMove = false;
var maxUploadPieceFileSizeTotal = 31457280; //30M
var creatingUUIDPieceFileCount = 0;
var shiftKeyPressed = false;
var lastCheckBoxId = 0;
var getListAjax = null;
var getDirsAjax = null;
var getOfflineListAjax = null;
var delayCounter = 15;
var delayCounterLen = 5;
var desktopMode = false;

$(function () {
    /*$(document).ready(function () {
        if (window.history && window.history.pushState) {
            $(window).on('popstate', function () {
                window.history.pushState('forward', null, '#');
                window.history.forward(1);
            });
        }
        window.history.pushState('forward', null, '#');
        window.history.forward(1);
    });*/

    $(window).bind('hashchange', function () {
        var newHref = $(location).prop('href');
        var jinIndex = newHref.indexOf('#');
        if (jinIndex > 0 && jinIndex + 1 !== newHref.length) {
            var params = [];
            var info = newHref.substring(jinIndex + 1, newHref.length);
            var kvs = info.split('&');
            for (var key in kvs) {
                var kv = kvs[key];
                if (kv.match(/[^=]+=[^=]*/)) {
                    var kvArr = kv.split('=');
                    params[kvArr[0]] = kvArr[1];
                }
            }
            if (params.hasOwnProperty('id')) {
                if (params.hasOwnProperty('page')) {
                    getDirs(params['id'], params['page']);
                } else {
                    getDirs(params['id']);
                }
            }
        }
    });

    if (window.innerWidth >= 768) {
        $('a[href^="#collapse0"]').click();
        desktopMode = true;
    }

    $(document).keydown(function (event) {
        if (event.keyCode === 17) {
            shiftKeyPressed = true;
        }
    });

    $(document).keyup(function () {
        if (event.keyCode === 17) {
            shiftKeyPressed = false;
        }
    });

    var theHref = $(location).prop('href');
    var theHrefClone = theHref;
    var jinIndex = theHref.indexOf('#');
    if (jinIndex > 0) {
        theHref = theHref.substring(0, jinIndex);
    }
    var newHref = theHref + '#id=' + currentDirId + '&page=' + currentPage;
    if (theHrefClone === newHref || desktopMode) {
        getDirs(currentDirId, currentPage);
    } else {
        $(location).prop('href', newHref);
    }

    $('#selectAll').bind('click', function () {
        $('input[type^="checkbox"]').prop('checked', true);
        lastCheckBoxId = 0;
    });

    $('#selectNone').bind('click', function () {
        $('input[type^="checkbox"]').prop('checked', false);
        lastCheckBoxId = 0;
    });

    $('#selectReverse').bind('click', function () {
        var boxes = $('input[type^="checkbox"]');
        for (var bi = 0; bi < boxes.length; bi++) {
            $(boxes[bi]).prop('checked', !$(boxes[bi]).prop('checked'));
        }
        lastCheckBoxId = 0;
    });

    $('#offlineList-table').on('click', '.cancelOfflineBtn', function () {
        if (clickedCancelOfflineBtn === this) {
            if (!cancellingOffline) {
                cancellingOffline = true;
                var firstTD = $(this).parent().parent().children()[0];
                //console.log(firstTD);
                var filename = $($(firstTD).find('input')[0]).val();
                //console.log(filename);
                $.ajax({
                    url: reqContextPath + '/user/home/file/cancelOffline.do',
                    type: 'GET',
                    dataType: 'json',
                    data: {filename: filename},
                    success: function (data, status, xhr) {
                        if (data['code'] === 0) {
                            $.tips("取消成功");
                            getOfflineList();
                        } else if (data['code'] === 2001) {
                            window.location.href = reqContextPath + '/user/login';
                            return;
                        } else {
                            $.tips(data['msg']);
                        }
                        cancellingOffline = false;
                    },
                    error: function (xhr, status, error) {
                        $.tips('服务器连接失败');
                        cancellingOffline = false;
                    }
                });
            }
        } else {
            clickedCancelOfflineBtn = this;
            $.tips('再次点击以确认');
        }


    });

    $('#getOfflineListBtn').bind('click', function () {
        getOfflineList();
    });

    $('#myOffline').bind('click', function () {
        $('#offlineListBtn').click();
        getOfflineList();
    });

    $('#confirmOfflineBtn').bind('click', function () {
        var url;
        if (!creatingOffline && (url = $('#offlineUrl').val()) != null && url.length > 0) {
            creatingOffline = true;
            $('#closeOfflineBtn').click();
            $.load();
            $.ajax({
                url: reqContextPath + '/user/home/file/offline.do',
                type: 'POST',
                dataType: 'json',
                data: {url: url},
                success: function (data, status, xhr) {
                    $.loaded();
                    if (data['code'] === 0) {
                        $.tips('创建成功');
                    } else if (data['code'] === 2001) {
                        window.location.href = reqContextPath + '/user/login';
                        return;
                    } else {
                        $.tips(data['msg']);
                    }
                    creatingOffline = false;
                },
                error: function (xhr, status, error) {
                    $.loaded();
                    $.tips('服务器连接失败');
                    creatingOffline = false;
                }
            });
        }
    });

    $('#createOfflineView').bind('click', function () {
        $('#offlineBtn').click();
        $('#offlineUrl').val('');
        var tempTimer = setInterval(function () {
            clearInterval(tempTimer);
            $('#offlineUrl')[0].focus();
        }, 600);
    });

    $('#confirmRenameBtn').bind('click', function () {
        if (!renamingDir) {
            var newName = $('#rename-dir-name').val();
            if (newName != null && newName.length > 0) {
                renamingDir = true;
                $.ajax({
                    url: reqContextPath + '/user/home/file/renameDir.do',
                    type: 'POST',
                    dataType: 'json',
                    data: {
                        dirId: $('#rename-dir-id').val(),
                        newName: newName
                    },
                    success: function (data, status, xhr) {
                        if (data['code'] === 0) {
                            $.tips('修改成功');
                            $('#closeRenameViewBtn').click();
                            getDirs(currentDirId, currentPage);
                        } else if (data['code'] === 2001) {
                            window.location.href = reqContextPath + '/user/login';
                            return;
                        } else {
                            $.tips(data['msg']);
                        }
                        renamingDir = false;
                    },
                    error: function (xhr, status, error) {
                        $.tips('服务器连接失败');
                        renamingDir = false;
                    }
                });
            }
        }
    });

    $('#confirmRenameTagBtn').bind('click', function () {
        if (!renamingTag) {
            var newTag = $('#rename-tag').val();
            if (newTag != null && newTag.length > 0) {
                renamingTag = true;
                $.ajax({
                    url: reqContextPath + '/user/home/file/renameTag.do',
                    type: 'POST',
                    dataType: 'json',
                    data: {
                        dirId: $('#rename-tag-file-id').val(),
                        newName: newTag
                    },
                    success: function (data, status, xhr) {
                        if (data['code'] === 0) {
                            $.tips('修改成功');
                            $('#closeTagBtn').click();
                            getDirs(currentDirId, currentPage);
                        } else if (data['code'] === 2001) {
                            window.location.href = reqContextPath + '/user/login';
                            return;
                        } else {
                            $.tips(data['msg']);
                        }
                        renamingTag = false;
                    },
                    error: function (xhr, status, error) {
                        $.tips('服务器连接失败');
                        renamingTag = false;
                    }
                });
            }
        }
    });

    $('#table-dir').on('click', '.renameBtn', function () {
        var firstTD = $(this).parent().parent().children()[0];
        var id = $(firstTD).find('label').attr('for');

        $('#rename-tag').val($(this).text());
        $('#rename-tag-file-id').val(id);
        $('#tagBtn').click();
        var tempTimer = setInterval(function () {
            $('#rename-tag')[0].focus();
            clearInterval(tempTimer);
        }, 600);
    }).on('click', '.table-dir-a', function () {
        keywords = '';
        var a_id = $(this).attr('id');
        a_id = a_id.substring(6);
        var theHref = $(location).prop('href');
        var theHrefClone = theHref;
        var jinIndex = theHref.indexOf('#');
        if (jinIndex > 0) {
            theHref = theHref.substring(0, jinIndex);
        }
        var newHref = theHref + '#id=' + a_id;
        if (theHrefClone === newHref || desktopMode) {
            getDirs(a_id);
        } else {
            $(location).prop('href', newHref);
        }
    }).on('click', 'input[type^="checkbox"]', function () {
        var lastCheckBoxIdClone = lastCheckBoxId;
        if ($(this).prop('checked')) {
            lastCheckBoxId = $(this).attr('id');
        } else {
            lastCheckBoxId = 0;
        }
        if (shiftKeyPressed && lastCheckBoxIdClone > 0 && lastCheckBoxId > 0) {
            var checkboxArr = $(this).parent().parent().parent().parent().find('input[type^="checkbox"]');
            var status = 0;
            for (var i = 0; i < checkboxArr.length; i++) {
                var checkID = $(checkboxArr[i]).attr('id');
                if (checkID === lastCheckBoxIdClone || checkID === lastCheckBoxId) {
                    status++;
                    if (status === 2) {
                        break;
                    }
                }
                if (status === 1) {
                    $(checkboxArr[i]).prop('checked', true);
                }
            }
            lastCheckBoxId = lastCheckBoxIdClone;
        }
    }).on('click', '.downloadLink-a', function () {
        copy2clipboard(window.location.protocol + '//' + window.location.host + $(this).attr('href'));
        return false;
    });

    $('#pathInfo').on('click', '.table-dir-a', function () {
        keywords = '';
        var a_id = $(this).attr('id');
        a_id = a_id.substring(6);
        var theHref = $(location).prop('href');
        var theHrefClone = theHref;
        var jinIndex = theHref.indexOf('#');
        if (jinIndex > 0) {
            theHref = theHref.substring(0, jinIndex);
        }
        newHref = theHref + '#id=' + a_id;
        if (theHrefClone === newHref || desktopMode) {
            getDirs(a_id);
        } else {
            $(location).prop('href', newHref);
        }
    });

    $('#confirmCreateDirBtn').bind('click', function () {
        if (!creatingNewDir) {
            var pid = currentDirId;
            var newDirName = $('#new-dir-name').val();
            if (newDirName !== null && newDirName.length > 0) {
                $.load();
                $('#closeCreateDirViewBtn').click();
                creatingNewDir = true;
                $.ajax({
                    url: reqContextPath + '/user/home/file/createDir.do',
                    type: 'POST',
                    dataType: 'json',
                    data: {
                        pid: pid,
                        dirName: newDirName
                    },
                    success: function (data, status, xhr) {
                        $.loaded();
                        if (data['code'] === 0) {
                            $.tips('新建成功！');
                            getDirs(currentDirId, currentPage);
                        } else if (data['code'] === 2001) {
                            window.location.href = reqContextPath + '/user/login';
                            return;
                        } else {
                            $.tips(data['msg']);
                        }
                        creatingNewDir = false;
                    },
                    error: function (xhr, status, error) {
                        $.loaded();
                        $.tips('服务器连接失败');
                        creatingNewDir = false;
                    }
                });
            } else {
                $.tips('输入为空');
            }
        }

    });

    $('#createNewDir').bind('click', function () {
        $('#new-dir-name').val('');
        $('#showCreateDirViewBtn').click();
        var tempTimer = setInterval(function () {
            $('#new-dir-name')[0].focus();
            clearInterval(tempTimer);
        }, 600)
    });

    $('#confirm-move-btn').bind('click', function () {
        if (!movingDirs) {
            $('#close-move-to-btn').click();
            $.load();
            movingDirs = true;
            var checkBoxForm = $('#checkBoxForm');
            $.ajax({
                url: reqContextPath + '/user/home/index/moveTo.do?pid=' + moveToDestDirId,
                type: 'POST',
                dataType: 'json',
                data: $(checkBoxForm).serialize(),
                success: function (data, status, xhr) {
                    $.loaded();
                    if (data['code'] === 0) {
                        $.tips('移动成功！');
                        getDirs(currentDirId, currentPage);
                    } else if (data['code'] === 2001) {
                        window.location.href = reqContextPath + '/user/login';
                        return;
                    } else {
                        $.tips(data['msg']);
                    }
                    movingDirs = false;
                },
                error: function (xhr, status, error) {
                    $.loaded();
                    $.tips('服务器连接失败');
                    movingDirs = false;
                }
            });
        }
    });

    $('#move-upper-dir').bind('click', function () {
        getList(moveToDestDirId, 2);
    });

    $('#move-list-table').on('click', '.table_a', function () {
        getList($(this).attr('dir_id'));
    });

    $('#move-dir_name').on('click', '.table_a', function () {
        getList($(this).attr('dir_id'));
    });

    $('#moveTo').bind('click', function () {
        $('#showMoveToList').click();
        $('#dirNameInMove').val('');
        getList(moveToDestDirId);
    });

    $('#createShare').bind('click', function () {
        if (!creatingShare) {
            var formQueryStr = $('#checkBoxForm').serialize();
            if (formQueryStr.length === 0) {
                $.tips('还没有选择');
                return;
            }
            var labels = $($($($('#createShareTimeType1').parent()).parent()).find('.modal-body')).find('label');
            var noPasswordLabel = labels[0];
            var hasPasswordLabel = labels[1];
            $(noPasswordLabel).addClass('active');
            $(hasPasswordLabel).removeClass('active');

            $('#createShareBtn').click();
        }
    });

    $('#createShareTimeType1').bind('click', function () {
        var hasPasswordLabel = $($($($(this).parent()).parent()).find('.modal-body')).find('label')[1];
        var type = 1;
        if ($(hasPasswordLabel).hasClass('active')) {
            type = 2;
        }
        createShare(type, 1);
        $('#closeCreateShareBtn').click();
    });

    $('#createShareTimeType2').bind('click', function () {
        var hasPasswordLabel = $($($($(this).parent()).parent()).find('.modal-body')).find('label')[1];
        var type = 1;
        if ($(hasPasswordLabel).hasClass('active')) {
            type = 2;
        }
        createShare(type, 2);
        $('#closeCreateShareBtn').click();
    });

    $('#copyShareBtn').bind('click', function () {
        copy2clipboard($(this).attr('data-sort'));
    });

    $('#multiDel').bind('click', function () {
        var formQueryStr = $(checkBoxForm).serialize();
        if (formQueryStr.length === 0) {
            $.tips('还没有选择');
            return;
        }

        $.confirm('确定删除？', function (bl) {
            if (bl && !deleting) {
                deleting = true;
                var checkBoxForm = $('#checkBoxForm');
                $.ajax({
                    url: reqContextPath + '/user/home/file/multiDel.do',
                    type: 'POST',
                    data: formQueryStr,
                    dataType: 'json',
                    success: function (data, status, xhr) {
                        if (data['code'] === 0) {
                            $.tips('删除成功！');
                            getDirs(currentDirId, currentPage);
                        } else if (data['code'] === 2001) {
                            window.location.href = reqContextPath + '/user/login';
                            return;
                        } else {
                            $.tips(data['msg']);
                        }
                        deleting = false;
                        return true;
                    },
                    error: function (xhr, status, error) {
                        $.tips('服务器连接失败');
                        deleting = false;
                        return true;
                    }
                });
            } else {
                return true;
            }

        }).cancel('不是，点错了').ok('是的');
    });

    $('#searchBtn').bind('click', function () {
        keywords = $('#searchText').val();
        getDirs(currentDirId, currentPage);
    });

    $('#cancelSearchBtn').bind('click', function () {
        $('#searchText').val('');
        $('#searchBtn').click();
    });

    $('#searchText').keydown(function (event) {
        if (event.keyCode === 13) {
            keywords = $('#searchText').val();
            getDirs(currentDirId, currentPage);
            return false;
        }
    });

    $('#prevBtn').bind('click', function () {
        if (currentPage === prev) {
            $.tips('到头了');
        } else {
            var theHref = $(location).prop('href');
            var jinIndex = theHref.indexOf('#');
            if (jinIndex > 0) {
                theHref = theHref.substring(0, jinIndex);
            }
            if (desktopMode) {
                getDirs(currentDirId, prev);
            } else {
                $(location).prop('href', theHref + '#id=' + currentDirId + '&page=' + prev);
            }

        }
    });

    $('#nextBtn').bind('click', function () {
        if (currentPage === next) {
            $.tips('到底了');
        } else {
            var theHref = $(location).prop('href');
            var jinIndex = theHref.indexOf('#');
            if (jinIndex > 0) {
                theHref = theHref.substring(0, jinIndex);
            }
            if (desktopMode) {
                getDirs(currentDirId, next);
            } else {
                $(location).prop('href', theHref + '#id=' + currentDirId + '&page=' + next);
            }
        }
    });

    $('#input-file').bind('change', function () {
        var toUploadDirId = currentDirId;
        var checkMD5Option = uploadWithMD5Check;
        var pieceUploadOption = uploadWithPiece;
        var input_file = $('#input-file');
        var files = input_file[0].files;
        // console.log(file.size);

        if (files == null || files.length === 0) {
            return false;
        }

        for (var fi = 0; fi < files.length; fi++) {
            files[fi].toUploadDirId = toUploadDirId;
            files[fi].uploadWithMD5Check = checkMD5Option;
            files[fi].uploadWithPiece = pieceUploadOption;
            readyList.put(files[fi]);
            updateUploadWaitList();
        }

        input_file.val('');

    });

    $('#input-dir').bind('change', function () {
        var toUploadDirId = currentDirId;
        var checkMD5Option = uploadWithMD5Check;
        var pieceUploadOption = uploadWithPiece;
        var input_file = $('#input-dir');
        var files = input_file[0].files;
        // console.log(file.size);

        if (files == null || files.length === 0) {
            return false;
        }

        for (var fi = 0; fi < files.length; fi++) {
            files[fi].toUploadDirId = toUploadDirId;
            files[fi].uploadWithMD5Check = checkMD5Option;
            files[fi].uploadWithPiece = pieceUploadOption;
            readyList.put(files[fi]);
            updateUploadWaitList();
        }

        input_file.val('');

    });

    $('#a-upload-file').bind('click', function () {
        uploadWithMD5Check = false;
        uploadWithPiece = false;
        $('#input-file').click();
    });

    $('#a-upload-file-md5').bind('click', function () {
        uploadWithMD5Check = true;
        uploadWithPiece = false;
        $('#input-file').click();
    });

    $('#a-upload-dir').bind('click', function () {
        uploadWithMD5Check = false;
        uploadWithPiece = false;
        $('#input-dir').click();
    });

    $('#a-upload-dir-md5').bind('click', function () {
        uploadWithMD5Check = true;
        uploadWithPiece = false;
        $('#input-dir').click();
    });

    $('#a-upload-file-piece').bind('click', function () {
        uploadWithMD5Check = false;
        uploadWithPiece = true;
        $('#input-file').click();
    });

    $('#a-upload-dir-piece').bind('click', function () {
        uploadWithMD5Check = false;
        uploadWithPiece = true;
        $('#input-dir').click();
    });

    $('#a-upload-file-piece-md5').bind('click', function () {
        uploadWithMD5Check = true;
        uploadWithPiece = true;
        $('#input-file').click();
    });

    $('#a-upload-dir-piece-md5').bind('click', function () {
        uploadWithMD5Check = true;
        uploadWithPiece = true;
        $('#input-dir').click();
    });

    $('#myUploadList').bind('click', function () {
        $('#uploadListBtn').click();
    });

    $('#uploadList-error-table').on('click', '.cancelUploadBtn', function () {
        var key = $($(this).parent().parent().find('input')[0]).val();
        errorList.remove(key);
        updateUploadErrorList();
    }).on('click', '.retryUploadBtn', function () {
        var key = $($(this).parent().parent().find('input')[0]).val();
        var retryFile = errorList.obj[key];
        readyList.put(retryFile);
        updateUploadWaitList();
        errorList.remove(key);
        updateUploadErrorList();

    });

    $('#uploadList-wait-table').on('click', '.cancelUploadBtn', function () {
        var key = $($(this).parent().parent().find('input')[0]).val();
        readyList.remove(key);
        updateUploadWaitList();
        $.tips('取消成功');
    });

    $('#createDirInMoveBtn').bind('click', function () {
        var dirName = $('#dirNameInMove').val();
        if (dirName == null || dirName.length === 0) {
            return;
        }
        if (!creatingDirInMove) {
            creatingDirInMove = true;
            $.ajax({
                url: reqContextPath + '/user/home/file/createDir.do',
                type: 'POST',
                dataType: 'json',
                data: {pid: moveToDestDirId, dirName: dirName},
                success: function (data, status, xhr) {
                    if (data['code'] === 0) {
                        $.tips('创建成功！');
                        $('#dirNameInMove').val('');
                        getList(moveToDestDirId, 1);
                    } else if (data['code'] === 2001) {
                        window.location.href = reqContextPath + '/user/login';
                        return;
                    }
                    creatingDirInMove = false;
                },
                error: function (xhr, status, error) {
                    $.tips('创建目录失败');
                    creatingDirInMove = false;
                }
            })
        }
    });

    $('#sort-filename').bind('click', function () {
        var sort = 1;
        if (currentSort === 1 || currentSort === 2) {
            if (currentSort === 1) {
                sort = 2;
            } else {
                sort = 1;
            }
        }
        getDirs(currentDirId, 1, sort);
    });

    $('#sort-size').bind('click', function () {
        var sort = 4;
        if (currentSort === 3 || currentSort === 4) {
            if (currentSort === 3) {
                sort = 4;
            } else {
                sort = 3;
            }
        }
        getDirs(currentDirId, 1, sort);
    });

    $('#sort-create').bind('click', function () {
        var sort = 6;
        if (currentSort === 5 || currentSort === 6) {
            if (currentSort === 5) {
                sort = 6;
            } else {
                sort = 5;
            }
        }
        getDirs(currentDirId, 1, sort);
    });

    //处理等待队列
    setInterval(function () {
        var oneKey = readyList.getOneKey();
        if (oneKey == null) {
            return;
        }

        var fileData = readyList.obj[oneKey];
        if (checkingMD5 && fileData.uploadWithMD5Check) {
            return;
        }

        var tooManyFiles = true;

        if (uploadingFilesCount < maxUploadingFiles) {
            tooManyFiles = false;
        }

        if (tooManyFiles && fileData.uploadWithPiece) {
            if (creatingUUIDPieceFileCount === 0) {
                var uploadPieceFileSizeCount = 0;
                var uploadPieceFileNumCount = 0;
                for (var uk in pieceFileUploadList.obj) {
                    if (pieceFileUploadList.obj.hasOwnProperty(uk)) {
                        uploadPieceFileNumCount++;
                        uploadPieceFileSizeCount += pieceFileUploadList.obj[uk].size;
                    }
                }

                if (uploadPieceFileSizeCount <= maxUploadPieceFileSizeTotal &&
                    uploadPieceFileNumCount < maxUploadingPiece) {
                    tooManyFiles = false;
                }
            }
        }

        if (tooManyFiles) {
            return;
        }

        readyList.remove(oneKey);
        updateUploadWaitList();

        $('#statusBars').append(
            $('<div></div>').attr('class', 'progress progress-striped active').append(
                $('<div></div>').attr('class', 'progress-bar').attr('role', 'progressbar')
                    .attr('aria-valuenow', '60').attr('aria-valuemin', '0').attr('aria-valuemax', '100')
                    .attr('id', 'progress' + progressbarNum).append(
                    $('<div></div>').attr('class', 'div-info-txt').append(
                        $('<span></span>').attr('id', 'span' + progressbarNum)
                    ).append(
                        '&nbsp;'
                    ).append(
                        $('<span></span>').attr('id', 'spanPTG' + progressbarNum).text('0%')
                    )
                )
            )
        );

        var progressbar = $('#progress' + progressbarNum);
        var progressbarText = $('#span' + progressbarNum);
        var progressbarPTG = $('#spanPTG' + progressbarNum);
        progressbarNum++;
        $(progressbar).css('width', '0');

        var objCancel = {};
        objCancel.canceled = false;
        objCancel.calculateMD5 = fileData.uploadWithMD5Check;

        fileData.progressbarPTG = progressbarPTG;
        if (fileData.uploadWithPiece) {
            fileData.combining = false;
            fileData.pieceInfo = {total: Math.ceil(fileData.size / pieceSize)};//total,1,2,3,..
            fileData.ajaxObjs = [];
            fileData.progressbar = progressbar;
            fileData.objCancel = objCancel;
            fileData.pieceErrorCount = 0;

            $(progressbar).parent().bind('click', function () {
                if (fileData.objCancel.calculateMD5) {
                    return;
                }

                $.confirm('取消上传 ' + getShortenFileName(fileData.name, 22) + ' ？', function (bl) {
                    if (bl) {
                        objCancel.canceled = true;
                        $(progressbar).parent().remove();
                        for (var ajo = 0; ajo < fileData.ajaxObjs.length; ajo++) {
                            if (fileData.ajaxObjs[ajo] != null) {
                                fileData.ajaxObjs[ajo].abort();
                            }
                        }
                        uploadingFilesCount--;
                        return true;
                    } else {
                        return true;
                    }
                }).cancel('不是，点错了').ok('是，取消');
            });

        }

        if (fileData.uploadWithMD5Check) {
            $(progressbar).parent().bind('click', function () {
                if (objCancel.calculateMD5) {
                    $.confirm('取消上传 ' + getShortenFileName(fileData.name, 22) + ' ？', function (bl) {
                        if (bl) {
                            objCancel.canceled = true;
                            return true;
                        } else {
                            return true;
                        }
                    }).cancel('不是，点错了').ok('是，取消');
                }
            });

            $(progressbar).addClass('progress-bar-success');
            $(progressbarText).text('计算MD5..');
            get_file_md5_sum(fileData, progressbar, progressbarText, objCancel);
        } else {
            $(progressbar).addClass('progress-bar-info');
            $(progressbarText).text(getShortenFileName(fileData.name));
            if (fileData.uploadWithPiece) {
                creatingUUIDPieceFileCount++;
                uploadingFilesCount++;
                $.ajax({
                    url: reqContextPath + '/user/home/file/createPieceUpload.do',
                    type: 'POST',
                    data: {
                        filename: fileData.name,
                        pid: fileData.toUploadDirId,
                        relativePath: fileData.webkitRelativePath,
                        totalPiece: fileData.pieceInfo.total
                    },
                    dataType: 'json',
                    success: function (data, status, xhr) {
                        creatingUUIDPieceFileCount--;
                        if (data['code'] === 0) {
                            var theUUID = data['uuid'];
                            if (theUUID.length > 0) {
                                fileData.uuid = theUUID;
                                pieceFileUploadList.put(fileData);
                            } else {
                                uploadingFilesCount--;
                                progressbar.parent().remove();
                                errorList.put(fileData);
                                updateUploadErrorList();
                            }
                        } else if (data['code'] === 2001) {
                            window.location.href = reqContextPath + '/user/login';
                        } else {
                            uploadingFilesCount--;
                            progressbar.parent().remove();
                            errorList.put(fileData);
                            updateUploadErrorList();
                        }
                    },
                    error: function (xhr, status, error) {
                        creatingUUIDPieceFileCount--;
                        uploadingFilesCount--;
                        fileData.progressbar.parent().remove();
                        errorList.put(fileData);
                        updateUploadErrorList();
                    }
                });
            } else {
                uploadFile(fileData, progressbar, objCancel);
            }
        }

    }, 200);

    //处理分片上传队列
    setInterval(function () {
        if (uploadingPieceCount < maxUploadingPiece) {
            if (uploadingPieceCount * 2 < maxUploadingPiece) {
                delayCounter = delayCounterLen;
            } else {
                if (delayCounter <= delayCounterLen) {
                    delayCounter++;
                }
            }
            var pieceFiles = pieceFileUploadList.obj;
            for (var key in pieceFiles) {
                if (pieceFiles.hasOwnProperty(key)) {
                    var fileData = pieceFiles[key];
                    if (fileData.objCancel.canceled) {
                        delete pieceFiles[key];
                        return;
                    }

                    if (fileData.pieceErrorCount >= pieceMaxErrorToCancel) {
                        delete pieceFiles[key];
                        fileData.objCancel.canceled = true;
                        fileData.progressbar.parent().remove();
                        for (var ajo = 0; ajo < fileData.ajaxObjs.length; ajo++) {
                            if (fileData.ajaxObjs[ajo] != null) {
                                fileData.ajaxObjs[ajo].abort();
                            }
                        }
                        errorList.put(fileData);
                        updateUploadErrorList();
                        uploadingFilesCount--;
                        return;
                    }

                    if (fileData.hasOwnProperty('pieceInfo')) {
                        var pieceInfo = fileData.pieceInfo;
                        var thisFileFinished = true;
                        var thisFileStartNum = 0;
                        for (var startNum = 1; startNum <= pieceInfo.total; startNum++) {
                            if (pieceInfo[startNum] === undefined || pieceInfo[startNum] < 96) {
                                thisFileFinished = false;
                            }
                            if (delayCounter >= delayCounterLen && (pieceInfo[startNum] === undefined || pieceInfo[startNum] === 0)) {
                                thisFileStartNum = startNum;
                            }
                            if (!thisFileFinished && (delayCounter < delayCounterLen || thisFileStartNum !== 0)) {
                                break;
                            }
                        }

                        if (delayCounter >= delayCounterLen) {
                            if (thisFileStartNum !== 0) {
                                delayCounter = 0;
                                pieceInfo[thisFileStartNum] = 1;
                                uploadingPieceCount++;
                                uploadPiece(fileData, thisFileStartNum);
                            }
                        }

                        if (thisFileFinished && !fileData['combining']) {
                            fileData['combining'] = true;
                            (function (temp_key, temp_fileData) {
                                var fiTimer = setInterval(function () {
                                    clearInterval(fiTimer);
                                    temp_fileData.ajaxObjs[temp_fileData.ajaxObjs.length] = $.ajax({
                                        url: reqContextPath + '/user/home/file/finishUpload.do',
                                        dataType: 'json',
                                        type: 'GET',
                                        data: {uuid: temp_fileData.uuid},
                                        success: function (data, status, xhr) {
                                            delete pieceFiles[temp_key];
                                            uploadingFilesCount--;
                                            temp_fileData.progressbar.parent().remove();
                                            if (data['code'] === 0) {
                                                $.tips('文件 ' + getShortenFileName(temp_fileData.name) + ' 上传成功');
                                                if (currentDirId === temp_fileData.toUploadDirId) {
                                                    getDirs(currentDirId, currentPage);
                                                }
                                            } else if (data['code'] === 2001) {
                                                window.location.href = reqContextPath + '/user/login';
                                            } else {
                                                errorList.put(temp_fileData);
                                                updateUploadErrorList();
                                                $.tips(data['msg']);
                                                console.log(data['msg']);
                                            }
                                        },
                                        error: function (xhr, status, error) {
                                            if (xhr.status === 524 || xhr.status === 504) {
                                                $.tips('文件 ' + getShortenFileName(temp_fileData.name) + ' 上传成功，但还在处理');
                                                if (currentDirId === temp_fileData.toUploadDirId) {
                                                    getDirs(currentDirId, currentPage);
                                                }
                                            } else {
                                                errorList.put(temp_fileData);
                                                updateUploadErrorList();
                                            }
                                            temp_fileData['progressbar'].parent().remove();
                                            delete pieceFiles[temp_key];
                                            uploadingFilesCount--;
                                        }
                                    });
                                }, 2000);
                            })(key, fileData);
                        }
                    }

                }
            }
        }
    }, 200);

    //处理分片上传进度条显示
    setInterval(function () {
        var pieceFiles = pieceFileUploadList.obj;
        for (var key in pieceFiles) {
            if (pieceFiles.hasOwnProperty(key)) {
                var fileData = pieceFiles[key];
                var pieceInfo = fileData.pieceInfo;
                var percentageCount = 0;
                for (var startNum = 1; startNum <= pieceInfo.total; startNum++) {
                    if (pieceInfo[startNum] !== undefined && pieceInfo[startNum] > 0) {
                        percentageCount += pieceInfo[startNum];
                    }
                }
                var averagePercentage = Math.ceil(percentageCount / pieceInfo.total);
                fileData.progressbar.css('width', averagePercentage + '%');
                fileData.progressbarPTG.text(averagePercentage + '%');
            }
        }
    }, 2000);

    //处理分片上传错误重置
    setInterval(function () {
        var pieceFiles = pieceFileUploadList.obj;
        for (var key in pieceFiles) {
            if (pieceFiles.hasOwnProperty(key)) {
                var fileData = pieceFiles[key];
                fileData.pieceErrorCount = 0;
            }
        }
    }, resetPieceErrorCountInterval);

});

function createShare(type, timeType) {
    if (!creatingShare) {
        var formQueryStr = $('#checkBoxForm').serialize();
        if (formQueryStr.length === 0) {
            $.tips('还没有选择');
            return;
        }

        creatingShare = true;
        if (type == null || type !== 2) {
            type = 1;
        } else {
            type = 2;
        }

        if (timeType == null || timeType !== 2) {
            timeType = 1;
        } else {
            timeType = 2;
        }

        formQueryStr += ('&type=' + type + '&timeType=' + timeType);
        $.load('正在创建..');
        $.ajax({
            url: reqContextPath + '/user/home/file/createShare.do',
            type: 'POST',
            dataType: 'json',
            data: formQueryStr,
            success: function (data, status, xhr) {
                $.loaded();
                var openShareBtn = $('#openShareBtn');
                var copyShareBtn = $('#copyShareBtn');
                if (data['code'] === 0) {
                    var url = window.location.protocol + '//' + window.location.host + '/share/show/' + data['share_id'];
                    var code = data['share_code'];
                    var shareText = url;
                    if (code.length > 0) {
                        shareText += (' 密码： ' + code);
                    }
                    $(copyShareBtn).attr('data-sort', shareText);
                    $(copyShareBtn).attr('disabled', false);
                    $(openShareBtn).attr('disabled', false);
                    $(openShareBtn).attr('href', reqContextPath + '/user/home/share?newId=' + data['share_id']);
                    $('#createShareResultText').text('创建分享成功！');
                } else if (data['code'] === 2001) {
                    window.location.href = reqContextPath + '/user/login';
                    return;
                } else {
                    $(openShareBtn).attr('disabled', true);
                    $(copyShareBtn).attr('disabled', true);
                    $('#createShareResultText').text(data['msg']);
                }
                $('#shareResultBtn').click();
                creatingShare = false;
            },
            error: function (xhr, status, error) {
                $.loaded();
                $.tips('服务器连接失败');
                creatingShare = false;
            }
        });
    }
}

function updateUploadErrorList() {
    var tbody = $('#uploadList-error-table').find('tbody');
    tbody.empty();
    for (var key in errorList.obj) {
        tbody.append(
            $('<tr></tr>').append(
                $('<td></td>').text(getShortenFileName(errorList.obj[key].name, 20)).append(
                    $('<input>').attr('type', 'hidden').attr('value', key)
                )
            ).append(
                $('<td></td>').text(getFormatSize(errorList.obj[key].size))
            ).append(
                $('<td></td>').attr('class', 'errorListTD').append(
                    $('<button></button>').attr('class', 'btn btn-info retryUploadBtn').attr('type', 'button').text('重试')
                ).append(
                    $('<button></button>').attr('class', 'btn btn-danger cancelUploadBtn').attr('type', 'button').text('取消')
                )
            )
        );
    }
}

function updateUploadWaitList() {
    var tbody = $('#uploadList-wait-table').find('tbody');
    tbody.empty();
    for (var key in readyList.obj) {
        tbody.append(
            $('<tr></tr>').append(
                $('<td></td>').text(getShortenFileName(readyList.obj[key].name, 20)).append(
                    $('<input>').attr('type', 'hidden').attr('value', key)
                )
            ).append(
                $('<td></td>').text(getFormatSize(readyList.obj[key].size))
            ).append(
                $('<td></td>').attr('class', 'waitListTD').append(
                    $('<button></button>').attr('class', 'btn btn-danger cancelUploadBtn').attr('type', 'button').text('取消')
                )
            )
        );
    }
}

function addFile(file, md5, progressbar, objCancel) {
    objCancel.calculateMD5 = false;
    var addFileAjax = $.ajax({
        url: upload_action,
        type: 'POST',
        dataType: 'json',
        data: {
            pid: file.toUploadDirId,
            md5: md5,
            filename: file.name,
            relativePath: file.webkitRelativePath
        },
        success: function (data, status, xhr) {
            if (data.code === 0) {
                $(progressbar).css('width', '100%');
                $(progressbar).parent().remove();
                $.tips(getShortenFileName(file.name) + '秒传成功！');
                if (currentDirId === file.toUploadDirId) {
                    getDirs(currentDirId, currentPage);
                }
                // console.log('通过秒传');
            } else {
                $(progressbar).parent().remove();
                $.tips(getShortenFileName(file.name) + '秒传失败！');
                console.log(data.msg);
            }
        },
        error: function (xhr, status, error) {
            if (objCancel.canceled) {
                $.tips(getShortenFileName(file.name) + '秒传取消！');
            } else {
                errorList.put(file);
                updateUploadErrorList();
                $.tips(getShortenFileName(file.name) + '秒传失败！');
            }
            $(progressbar).parent().remove();
        }
    });

    $(progressbar).parent().bind('click', function () {
        $.confirm('取消上传 ' + getShortenFileName(file.name) + ' ？', function (bl) {
            if (bl) {
                objCancel.canceled = true;
                addFileAjax.abort();
            }
            return true;
        }).cancel('不是，点错了').ok('是，取消');
    });
}

function uploadFile(file, progressbar, objCancel) {
    uploadingFilesCount++;
    objCancel.calculateMD5 = false;
    var fd = new FormData();
    fd.append('file', file);
    fd.append('pid', file.toUploadDirId);
    fd.append('relativePath', file.webkitRelativePath);

    var uploadFileAjax = $.ajax({
        processData: false,
        cache: false,
        contentType: false,
        url: upload_action,
        type: 'POST',
        data: fd,
        xhr: function () {
            var myXhr = $.ajaxSettings.xhr();
            if (myXhr.upload) {
                myXhr.upload.addEventListener('progress', function (evt) {
                    if (evt.lengthComputable) {
                        $(progressbar).css('width', Math.round(evt.loaded * 95 / evt.total) + '%');
                        file.progressbarPTG.text(Math.round(evt.loaded * 95 / evt.total) + '%');
                    }
                });
            }
            return myXhr;
        },
        success: function (data, status, xhr) {
            $(progressbar).css('width', '100%');
            $(progressbar).parent().remove();
            $.tips(getShortenFileName(file.name) + '上传成功！');
            if (currentDirId === file.toUploadDirId) {
                getDirs(currentDirId, currentPage);
            }
            uploadingFilesCount--;
        },
        error: function (xhr, status, error) {
            if (objCancel.canceled) {
                $.tips(getShortenFileName(file.name) + '上传取消！');
            } else {
                errorList.put(file);
                updateUploadErrorList();
                $.tips(getShortenFileName(file.name) + '上传失败！');
            }
            $(progressbar).parent().remove();
            uploadingFilesCount--;
        }
    });

    $(progressbar).parent().bind('click', function () {
        $.confirm('取消上传 ' + getShortenFileName(file.name) + ' ？', function (bl) {
            if (bl) {
                objCancel.canceled = true;
                uploadFileAjax.abort();
            }
            return true;
        }).cancel('不是，点错了').ok('是，取消');
    });
}

function uploadPiece(file, pieceNum) {
    var pieceFileReader = new FileReader();
    var pieceSpark = new SparkMD5.ArrayBuffer();
    var startPoint = (pieceNum - 1) * pieceSize;
    var endPoint;
    if ((endPoint = pieceNum * pieceSize) > file.length) {
        endPoint = file.length;
    }

    pieceFileReader.onerror = function (e) {
        uploadingPieceCount--;
        file.pieceInfo[pieceNum] = 0;
    };

    pieceFileReader.onload = function (e) {
        pieceSpark.append(e.target.result);
        var pieceMD5 = pieceSpark.end();
        if (file.objCancel.canceled) {
            return;
        }

        var fd = new FormData();
        fd.append('pieceNum', pieceNum);
        fd.append('uuid', file.uuid);
        fd.append('pieceFile', file.slice(startPoint, endPoint));
        fd.append('pieceMD5', pieceMD5);
        var ajaxPoint = file.ajaxObjs.length;
        file.ajaxObjs[ajaxPoint] = $.ajax({
            url: reqContextPath + '/user/home/file/uploadPiece.do',
            type: 'POST',
            dataType: 'json',
            timeout: pieceUploadTimeout,
            processData: false,
            cache: false,
            contentType: false,
            data: fd,
            xhr: function () {
                var myXhr = $.ajaxSettings.xhr();
                if (myXhr.upload) {
                    myXhr.upload.addEventListener('progress', function (evt) {
                        if (evt.lengthComputable && file.pieceInfo[pieceNum] > 0) {
                            var loadPercentage = Math.round(evt.loaded * 95 / evt.total);
                            if (loadPercentage === 0) {
                                loadPercentage = 1;
                            }
                            file.pieceInfo[pieceNum] = loadPercentage;
                        }
                    });
                }
                return myXhr;
            },
            success: function (data, status, xhr) {
                if (data['code'] === 0) {
                    file.pieceInfo[pieceNum] = 96;
                    file.ajaxObjs[ajaxPoint] = null;
                    uploadingPieceCount--;
                } else if (data['code'] === 2001) {
                    window.location.href = reqContextPath + '/user/login';
                } else {
                    file.ajaxObjs[ajaxPoint] = null;
                    file.pieceInfo[pieceNum] = 0;
                    uploadingPieceCount--;
                    file.pieceErrorCount++;
                }
            },
            error: function (xhr, status, error) {
                file.ajaxObjs[ajaxPoint] = null;
                file.pieceInfo[pieceNum] = 0;
                uploadingPieceCount--;
                file.pieceErrorCount++;
            }
        });
    };

    pieceFileReader.readAsArrayBuffer(blobSlice.call(file, startPoint, endPoint));
}


function get_file_md5_sum(file, progressbar, progressbarText, objCancel) {
    checkingMD5 = true;
    var myDate = new Date();
    var time = myDate.getTime();

    var tmp_md5;
    var chunkSize = 8097152,
        chunks = Math.ceil(file.size / chunkSize),
        currentChunk = 0,
        spark = new SparkMD5.ArrayBuffer(),
        fileReader = new FileReader();

    fileReader.onload = function (e) {
        // console.log('read chunk nr', currentChunk + 1, 'of', chunks);
        spark.append(e.target.result);
        currentChunk++;
        var md5_progress = Math.floor((currentChunk / chunks) * 100);
        myDate = new Date();
        var temp = myDate.getTime();
        if (temp - time > 600) {
            $(progressbar).css('width', md5_progress + '%');
            time = temp;
        }
        if (objCancel.canceled) {
            checkingMD5 = false;
            $(progressbar).parent().remove();
            return;
        }
        if (currentChunk < chunks) {
            loadNext();
        } else {
            tmp_md5 = spark.end();

            $.ajax({
                url: reqContextPath + '/user/home/file/checkMD5',
                type: 'POST',
                data: {md5: tmp_md5},
                success: function (data, status, xhr) {
                    $(progressbar).css('width', '100%');
                    $(progressbarText).text(getShortenFileName(file.name));
                    $(progressbar).removeClass('progress-bar-success');
                    $(progressbar).addClass('progress-bar-info');
                    $(progressbar).css('width', '0');
                    if (data === 'true') {
                        addFile(file, tmp_md5, progressbar, objCancel);
                    } else {
                        // handler_info.innerHTML = file.name + "的MD5值是：" + tmp_md5;
                        // uploadFile(file, progressbar, objCancel);

                        if (file.uploadWithPiece) {
                            creatingUUIDPieceFileCount++;
                            uploadingFilesCount++;
                            $.ajax({
                                url: reqContextPath + '/user/home/file/createPieceUpload.do',
                                type: 'POST',
                                data: {
                                    filename: file.name,
                                    pid: file.toUploadDirId,
                                    relativePath: file.webkitRelativePath,
                                    totalPiece: file.pieceInfo.total
                                },
                                dataType: 'json',
                                success: function (data, status, xhr) {
                                    creatingUUIDPieceFileCount--;
                                    if (data['code'] === 0) {
                                        var theUUID = data['uuid'];
                                        if (theUUID.length > 0) {
                                            file.uuid = theUUID;
                                            pieceFileUploadList.put(file);
                                            objCancel.calculateMD5 = false;
                                        } else {
                                            uploadingFilesCount--;
                                            progressbar.parent().remove();
                                            errorList.put(file);
                                            updateUploadErrorList();
                                        }
                                    } else if (data['code'] === 2001) {
                                        window.location.href = reqContextPath + '/user/login';
                                    } else {
                                        uploadingFilesCount--;
                                        progressbar.parent().remove();
                                        errorList.put(file);
                                        updateUploadErrorList();
                                    }
                                },
                                error: function (xhr, status, error) {
                                    creatingUUIDPieceFileCount--;
                                    uploadingFilesCount--;
                                    file.progressbar.parent().remove();
                                    errorList.put(file);
                                    updateUploadErrorList();
                                }
                            });
                        } else {
                            uploadFile(file, progressbar, objCancel);
                        }

                    }
                    checkingMD5 = false;
                },
                error: function (xhr, status, error) {
                    $(progressbar).parent().remove();
                    $.tips(getShortenFileName(file.name) + '查询MD5失败！');
                    console.log(error);
                    checkingMD5 = false;
                }
            });


        }
    };

    fileReader.onerror = function () {
        console.warn('oops, something went wrong.');
        $(progressbar).parent().remove();
        $.tips(getShortenFileName(file.name) + 'MD5计算失败！');
        checkingMD5 = false;
    };

    function loadNext() {
        var start = currentChunk * chunkSize,
            end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;
        fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
    }

    loadNext();
}

function getShortenFileName(fileName, myLength) {
    var len = fileName.length;
    var newFileName = '';
    var realLen = 0;
    for (i = 0; i < len; i++) {
        if ((fileName.charCodeAt(i) & 0xff00) !== 0) {
            realLen++;
        }
        realLen++;
    }

    var addLen = 0;
    var maxLen = 12;
    var partLen = 4;
    if (myLength != null && myLength > 0) {
        if (myLength % 2 !== 0) {
            myLength--;
        }
        maxLen = myLength;
        partLen = (myLength - 4) / 2;
    }

    if (realLen >= maxLen) {
        for (i = 0; i < len; i++) {
            if ((fileName.charCodeAt(i) & 0xff00) !== 0) {
                addLen++;
            }
            addLen++;
            if (addLen > partLen) {
                break;
            }
            newFileName += fileName.charAt(i);
        }

        addLen = 0;

        var fileNameEnd = '';

        for (i = len - 1; i >= 0; i--) {
            if ((fileName.charCodeAt(i) & 0xff00) !== 0) {
                addLen++;
            }
            addLen++;

            if (addLen > partLen) {
                break;
            }
            fileNameEnd = fileName.charAt(i) + fileNameEnd;
        }

        newFileName += '...' + fileNameEnd;
        return newFileName;

    } else {
        return fileName;
    }

}

function getOfflineList() {
    clickedCancelOfflineBtn = null;
    var tbody = $('#offlineList-table').find('tbody');
    tbody.empty();
    $('#offlineListInfo').text('加载中..');

    if (getOfflineListAjax != null) {
        getOfflineListAjax.abort();
    }

    getOfflineListAjax = $.ajax({
        url: reqContextPath + '/user/home/file/offlineList.do',
        type: 'GET',
        dataType: 'json',
        data: {},
        success: function (data, status, xhr) {
            if (data['code'] === 2001) {
                window.location.href = reqContextPath + '/user/login';
                return;
            }

            $('#offlineListInfo').text('列表');
            for (var i = 0; i < data['length']; i++) {
                tbody.append(
                    $('<tr></tr>').append(
                        $('<td></td>').text(getShortenFileName(data[i].originalFilename, 20)).append(
                            $('<input>').attr('value', data[i].filename).attr('type', 'hidden')
                        )
                    ).append(
                        $('<td></td>').text(getFormatSize(data[i].length))
                    ).append(
                        $('<td></td>').text(getLocalTime(data[i].last_update))
                    ).append(
                        $('<td></td>').attr('class', 'cancelOfflineTD').append(
                            $('<button></button>').attr('type', 'button').attr('class', 'btn btn-info cancelOfflineBtn').text('取消')
                        )
                    )
                )
            }
        },
        error: function (xhr, status, error) {
            if (status !== 'abort') {
                $.tips('获取离线列表失败');
                $('#offlineListInfo').text('加载失败');
            }
        }
    });

}

function getDirs(id, page, sort) {
    if (id == null) {
        id = 0;
    }

    if (page == null || page === 0) {
        page = 1;
    }

    if (sort == null || sort < 1 || sort > 6) {
        sort = currentSort;
    }

    var data;
    if (keywords == null || keywords.length === 0) {
        if (isSearch) {
            page = 1;
        }
        isSearch = false;
        data = {pid: id, page: page, sort: sort};
    } else {
        if (!isSearch) {
            page = 1;
        }
        isSearch = true;
        data = {keywords: keywords, page: page, sort: sort};
    }
    // $.load();
    $.tips('正在刷新');

    if (getDirsAjax != null) {
        getDirsAjax.abort();
    }

    getDirsAjax = $.ajax({
        url: reqContextPath + '/user/home/index.do',
        type: 'GET',
        dataType: 'json',
        data: data,
        success: function (data, status, xhr) {
            if (data['code'] === 2001) {
                window.location.href = reqContextPath + '/user/login';
                return;
            }

            // console.log(data);
            var tbody = $('#table-dir').find('tbody');
            var pathInfo = $('#pathInfo');
            $(tbody).empty();
            $(pathInfo).empty();
            currentDirId = data['currentDirId'];
            next = data['next'];
            prev = data['prev'];
            currentPage = data['currentPage'];
            currentSort = data['currentSort'];
            var userDirs = data['userDirs'];
            var aboveDirList = data['aboveDirList'];

            if (aboveDirList.length > 0) {
                $(pathInfo).append('<i class="fa fa-home" aria-hidden="true"></i>&nbsp;');
                for (var j = 0; j < aboveDirList.length - 1; j++) {
                    $(pathInfo).append(
                        $('<a href="javascript:void(0)" id="a-pid-' + aboveDirList[j].id + '" class="table-dir-a"></a>').text(aboveDirList[j].name)
                    ).append(' > ');
                }

                $(pathInfo).append(
                    $('<a href="javascript:void(0)" id="a-pid-' + aboveDirList[j].id + '" class="table-dir-a"></a>').text(aboveDirList[j].name)
                )
            }


            for (var i = 0; i < userDirs.length; i++) {
                var size;
                var dirName;
                if (userDirs[i].is_dir === 1) {
                    size = '--';
                    dirName = '<i class="fa fa-folder-open-o" aria-hidden="true"></i>&nbsp;<a href="javascript:void(0)" id="a-pid-' + userDirs[i].id + '" class="table-dir-a">' + userDirs[i].name + '</a>';
                } else {
                    size = getFormatSize(userDirs[i].file_length);
                    dirName = '<i class="fa fa-file-text-o" aria-hidden="true"></i>&nbsp;<a class="downloadLink-a" target="_blank" download="' + userDirs[i].name + '" href="' +
                        data['prjPath'] +
                        '/user/home/file/download/' + userDirs[i].id + '/' + data['token'] + '/' + encodeURI(userDirs[i].name) +
                        '">' + userDirs[i].name + '</a>';
                }

                $(tbody).append(
                    $('<tr></tr>').append(
                        $('<td></td>').append(
                            $('<div class="checkbox checkbox-primary checkbox-div"></div>').append(
                                $('<input form="checkBoxForm" name="ids[]" id="' + userDirs[i].id + '" value="' + userDirs[i].id + '" class="styled" type="checkbox">')
                            ).append(
                                $('<label for="' + userDirs[i].id + '"></label>')
                            )
                        ).append($(dirName))
                    ).append(
                        $('<td></td>').append(
                            $('<span></span>').text(size)
                        )
                    ).append(
                        $('<td></td>').append(
                            $('<span></span>').text(getLocalTimeWithoutSeconds(userDirs[i].create_time))
                        )
                    ).append(
                        $('<td></td>').attr('class', 'renameTD').append(
                            $('<button class="btn btn-default renameBtn" type="button">' + (userDirs[i].tag === '' ? '标签' : userDirs[i].tag) + '</button>')
                        )
                    )
                );
            }
            // $.loaded();
            $.tips('刷新成功');
        },
        error: function (xhr, status, error) {
            if (status !== 'abort') {
                $.tips('刷新失败！');
                // $.loaded();
            }
        }
    });

}

function getList(id, type) {
    $('#confirm-move-btn').attr('disabled', true);
    var move_list_table = $('#move-list-table');
    $(move_list_table).empty();
    $('#move-dir_name').text('加载中..');

    if (id == null) {
        id = 0;
    }
    if (type == null) {
        type = 1;
    }

    if (getListAjax != null) {
        getListAjax.abort();
    }

    getListAjax = $.ajax({
        url: reqContextPath + '/user/home/index/dirs.do',
        type: 'GET',
        dataType: 'json',
        data: {id: id, type: type},
        success: function (data, status, xhr) {
            if (data['code'] === 2001) {
                window.location.href = reqContextPath + '/user/login';
                return;
            }
            // var destDirId = data['currentId'];
            $('#confirm-move-btn').attr('disabled', false);
            moveToDestDirId = data['currentId'];
            $('#move-dir_name').text(data['currentName']);

            var dirs = data['dirs'];
            for (var i = 0; i < dirs.length; i++) {
                $(move_list_table).append($('<tr></tr>').append($('<td></td>').append(
                    $('<a></a>').attr('href', 'javascript:void(0)').attr('class', 'table_a').attr('dir_id', dirs[i].id).text(dirs[i].name)
                )));
            }
        },
        error: function (xhr, status, error) {
            if (status !== 'abort') {
                $('#confirm-move-btn').attr('disabled', false);
                $('#move-dir_name').text('').append(
                    $('<a href="javascript:void(0)"></a>').attr('class', 'table_a').attr('dir_id', id).text('加载失败，点击重试')
                );
                $.tips('加载失败');
            }
        }
    });
}

function HashMap() {
    this.num = 1;
    this.len = 0;
    this.obj = {};

    this.getData = function () {
        return this.obj;
    };

    this.length = function () {
        return this.len;
    };

    this.getOneKey = function () {
        for (var key in this.obj) {
            if (key != null) {
                return key;
            }
        }
        return null;
    };

    this.pop = function () {
        for (var key in this.obj) {
            var value = this.obj[key];
            if (value != null) {
                this.remove(key);
                return value;
            }
        }
        return null;
    };

    this.containsKey = function (key) {
        return (key in this.obj);
    };

    this.containsValue = function (value) {
        for (var key in  this.obj) {
            if (this.obj.hasOwnProperty(key) && this.obj[key] === value) {
                return true;
            }
        }
        return false;
    };

    this.put = function (value) {
        this.obj[this.num] = value;
        this.num++;
        this.len++;
    };

    this.get = function (key) {
        return this.containsKey(key) ? this.obj[key] : null;
    };

    this.remove = function (key) {
        if (this.containsKey(key) && delete this.obj[key]) {
            this.len--;
        }
    };

}

function isMobile() {
    var sUserAgent = navigator.userAgent.toLowerCase();
    var bIsIpad = sUserAgent.match(/ipad/i) === "ipad";
    var bIsIphoneOs = sUserAgent.match(/iphone os/i) === "iphone os";
    var bIsMidp = sUserAgent.match(/midp/i) === "midp";
    var bIsUc7 = sUserAgent.match(/rv:1.2.3.4/i) === "rv:1.2.3.4";
    var bIsUc = sUserAgent.match(/ucweb/i) === "ucweb";
    var bIsAndroid = sUserAgent.match(/android/i) === "android";
    var bIsCE = sUserAgent.match(/windows ce/i) === "windows ce";
    var bIsWM = sUserAgent.match(/windows mobile/i) === "windows mobile";
    return bIsIpad || bIsIphoneOs || bIsMidp || bIsUc7 || bIsUc || bIsAndroid || bIsCE || bIsWM;
}

function getFormatSize(size) {
    if (size > 1024 * 1024 * 1024) {
        return (size / 1024 / 1024 / 1024).toFixed(2) + 'G';
    } else if (size > 1024 * 1024) {
        return (size / 1024 / 1024).toFixed(2) + 'M';
    } else {
        return (size / 1024).toFixed(2) + 'K';
    }
}

function getLocalTimeWithoutSeconds(nS) {
    var dateRaw = new Date(parseInt(nS) * 1000).toLocaleString();
    var dateArr = dateRaw.replace(/:\d{1,2}$/, ' ').replace(/上午/, '').replace(/下午/, '').replace(/年/, '/').replace(/月/, '/').replace(/日/, '/').split(' ');
    var timeArr = dateArr[1].split(':');
    if (dateRaw.match(/下午/)) {
        if (timeArr[0] !== '12')
            timeArr[0] = parseInt(timeArr[0]) + 12;
    } else if (dateRaw.match(/上午/)) {
        if (timeArr[0] === '12')
            timeArr[0] = parseInt(timeArr[0]) - 12;
    } else {
        return dateRaw;
    }
    var dateStr = dateArr[0] + ' ' + timeArr[0] + ':' + timeArr[1];
    return dateStr;
}

function getLocalTime(nS) {
    return new Date(parseInt(nS) * 1000).toLocaleString('chinese', {hour12: false}).replace(/(上午|下午)/, '');
}

function copy2clipboard(text) {
    if (text === null || text.length === 0) {
        $.tips('文字为空');
        return;
    }
    $(document).off('focusin.modal');
    var clipboard = $('#clipboard');
    $(clipboard).val(text);
    $(clipboard)[0].select();
    document.execCommand("Copy");
    $.tips('复制完毕！');
    $(clipboard)[0].blur();
}